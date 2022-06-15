// SPDX-License-Identifier: bsl-1.1
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "./Auth.sol";
import "./Parameters01.sol";
import "./Assets01.sol";


contract BorrowModule01 is Auth, ReentrancyGuard {
    using Parameters01 for IParametersStorage;
    using Assets01 for Assets01.AssetType;
    using EnumerableSet for EnumerableSet.UintSet;

    enum LoanState { WasNotCreated, AuctionStarted, AuctionCancelled, Issued, Finished, Liquidated }

    struct AuctionInfo {
        address borrower;
        uint32 startTS;
        uint16 interestRateMin;
        uint16 interestRateMax;
    }

    struct Loan {
        // slot 256 (Nested struct takes up the whole slot. We have to do this since error "Stack too deep..")
        AuctionInfo auctionInfo;

        // slot 240
        LoanState state;
        Assets01.AssetType collateralType;
        uint16 durationDays;
        uint32 startTS;
        uint16 interestRate;
        address collateral;

        // slot 256
        uint collateralIdOrAmount;

        // slot 160
        address lender;

        // slot 160
        address debtCurrency;

        // slot 256
        uint debtAmount;
    }

    struct AuctionStartParams {
        Assets01.AssetType collateralType;
        uint16 durationDays;

        uint16 interestRateMin;
        uint16 interestRateMax;

        address collateral;
        uint collateralIdOrAmount;

        address debtCurrency;
        uint debtAmount;
    }

    event AuctionStarted(uint loanId, address borrower);
    event AuctionCancelled(uint loanId, address borrower);

    event LoanIssued(uint loanId, address lender);
    event LoanRepaid(uint loanId, address borrower);
    event LoanLiquidated(uint loanId, address liquidator);

    uint public constant BASIS_POINTS_IN_1 = 1e4;
    uint public constant MAX_DURATION_DAYS = 365 * 2;

    Loan[] public loans;
    mapping(address => uint[]) loanIdsByUser;
    EnumerableSet.UintSet activeAuctions;
    EnumerableSet.UintSet activeLoans;

    constructor(address _parametersStorage) Auth(_parametersStorage) {}

    function startAuction(AuctionStartParams memory _params) external nonReentrant returns (uint _loanId) {
        require(0 < _params.durationDays &&_params.durationDays <= MAX_DURATION_DAYS, 'INVALID_LOAN_DURATION');
        require(0 < _params.interestRateMin && _params.interestRateMin <= _params.interestRateMax, 'INVALID_INTEREST_RATE');
        require(_params.collateral != address(0) && _params.collateralIdOrAmount > 0, 'INVALID_COLLATERAL');
        require(_params.debtCurrency != address(0) && _params.debtAmount > 0, 'INVALID_DEBT_CURRENCY');
        calcTotalDebt(_params.debtAmount, _params.interestRateMax, _params.durationDays); // just check that there is no overflow on total debt

        _loanId = loans.length;
        loans.push(
            Loan(
                AuctionInfo(
                    msg.sender,
                    uint32(block.timestamp),
                    _params.interestRateMin,
                    _params.interestRateMax
                ),

                LoanState.AuctionStarted,
                _params.collateralType,
                _params.durationDays,
                0, // startTS
                0, // interestRate
                _params.collateral,

                _params.collateralIdOrAmount,

                address(0),

                _params.debtCurrency,

                _params.debtAmount
            )
        );

        loanIdsByUser[msg.sender].push(_loanId);
        require(activeAuctions.add(_loanId), 'BROKEN_STRUCTURE');

        _params.collateralType.getAssetFrom(_params.collateral, _params.collateralIdOrAmount, msg.sender, address(this));

        emit AuctionStarted(_loanId, msg.sender);
    }

    function cancelAuction(uint _loanId) external nonReentrant {
        Loan storage loan = requireLoan(_loanId);
        require(loan.auctionInfo.borrower == msg.sender, 'AUTH_FAILED');

        changeLoanState(loan, LoanState.AuctionCancelled);
        require(activeAuctions.remove(_loanId), 'BROKEN_STRUCTURE');

        loan.collateralType.sendAssetTo(loan.collateral, loan.collateralIdOrAmount, loan.auctionInfo.borrower);

        emit AuctionCancelled(_loanId, msg.sender);
    }

    function accept(uint _loanId) external nonReentrant {
        Loan storage loan = requireLoan(_loanId);

        require(loan.auctionInfo.borrower != msg.sender, 'INVALID_AUCTION_OWNER');

        uint auctionEndTs = loan.auctionInfo.startTS + parameters.getAuctionDuration();
        require(auctionEndTs > block.timestamp, 'EXPIRED_AUCTION');

        changeLoanState(loan, LoanState.Issued);
        require(activeAuctions.remove(_loanId), 'BROKEN_STRUCTURE');
        require(activeLoans.add(_loanId), 'BROKEN_STRUCTURE');

        loan.startTS = uint32(block.timestamp);
        loan.lender = msg.sender;
        loan.interestRate = calcCurrentInterestRate(loan.auctionInfo.startTS, auctionEndTs, loan.auctionInfo.interestRateMin, loan.auctionInfo.interestRateMax);

        loanIdsByUser[msg.sender].push(_loanId);

        (uint feeAmount, uint amountWithoutFee) = calcFeeAmount(loan.debtCurrency, loan.debtAmount);

        Assets01.AssetType.ERC20.getAssetFrom(loan.debtCurrency, feeAmount, msg.sender, parameters.treasury());
        Assets01.AssetType.ERC20.getAssetFrom(loan.debtCurrency, amountWithoutFee, msg.sender, loan.auctionInfo.borrower);

        emit LoanIssued(_loanId, msg.sender);
    }

    /**
     * @notice Repay loan debt. In any time debt + full interest rate for loan period must be repaid.
     * MUST be repaid before loan period end to avoid liquidations. MAY be repaid after loan period end, but before liquidation.
     */
    function repay(uint _loanId) external nonReentrant {
        Loan storage loan = requireLoan(_loanId);
        require(loan.auctionInfo.borrower == msg.sender, 'AUTH_FAILED');

        changeLoanState(loan, LoanState.Finished);
        require(activeLoans.remove(_loanId), 'BROKEN_STRUCTURE');

        uint totalDebt = calcTotalDebt(loan.debtAmount, loan.interestRate, loan.durationDays);
        Assets01.AssetType.ERC20.getAssetFrom(loan.debtCurrency, totalDebt, msg.sender, loan.lender);
        loan.collateralType.sendAssetTo(loan.collateral, loan.collateralIdOrAmount, loan.auctionInfo.borrower);

        emit LoanRepaid(_loanId, msg.sender);
    }

    function liquidate(uint _loanId) external nonReentrant {
        Loan storage loan = requireLoan(_loanId);

        require(loan.startTS + loan.durationDays * 1 days < block.timestamp, 'LOAN_IS_ACTIVE');

        changeLoanState(loan, LoanState.Liquidated);
        require(activeLoans.remove(_loanId), 'BROKEN_STRUCTURE');

        loan.collateralType.sendAssetTo(loan.collateral, loan.collateralIdOrAmount, loan.lender);

        emit LoanLiquidated(_loanId, msg.sender);
    }

    function requireLoan(uint _loadId) internal view returns (Loan storage _loan) {
        require(_loadId < loans.length, 'INVALID_LOAN_ID');
        _loan = loans[_loadId];
    }

    function changeLoanState(Loan storage _loan, LoanState _newState) internal {
        LoanState currentState = _loan.state;
        if (currentState == LoanState.AuctionStarted) {
            require(_newState == LoanState.AuctionCancelled || _newState == LoanState.Issued, 'INVALID_LOAN_STATE');
        } else if (currentState == LoanState.Issued) {
            require(_newState == LoanState.Finished || _newState == LoanState.Liquidated, 'INVALID_LOAN_STATE');
        } else if (currentState == LoanState.AuctionCancelled || currentState == LoanState.Finished || currentState == LoanState.Liquidated) {
            revert('INVALID_LOAN_STATE');
        } else {
            revert('BROKEN_LOGIC'); // just to be sure that all states are covered
        }

        _loan.state = _newState;
    }

    //////

    function getLoansCount() external view returns (uint) {
        return loans.length;
    }

    /**
     * @dev may not work on huge amount of loans, in this case use version with limits
     */
    function getLoans() external view returns(Loan[] memory) {
        return loans;
    }

    function getLoans(uint _offset, uint _limit) external view returns(Loan[] memory _loans) {
        _loans = new Loan[](_limit);
        uint loansCount = loans.length;
        for (uint i = 0; i < _limit; i++) {
            if (_offset + i >= loansCount) {
                break;
            }
            _loans[i] = loans[_offset + i];
        }
    }

    //////

    function getActiveAuctionsCount() public view returns (uint) {
        return activeAuctions.length();
    }

    /**
     * @dev may not work on huge amount of loans, in this case use version with limits
     */
    function getActiveAuctions() public view returns (uint[] memory _ids, Loan[] memory _loans) {
        _ids = activeAuctions.values();
        _loans = new Loan[](_ids.length);
        for (uint i=0; i<_ids.length; i++) {
            _loans[i] = loans[ _ids[i] ];
        }
    }

    function getActiveAuctions(uint _offset, uint _limit) public view returns (uint[] memory _ids, Loan[] memory _loans) {
        _ids = new uint[](_limit);
        _loans = new Loan[](_limit);
        uint activeAuctionsCount = activeAuctions.length();
        for (uint i = 0; i < _limit; i++) {
            if (_offset + i >= activeAuctionsCount) {
                break;
            }
            _ids[i] = activeAuctions.at(i);
            _loans[i] = loans[ _ids[i] ];
        }
    }

    function getActiveAuction(uint _index) public view returns (uint _id, Loan memory _loan) {
        _id = activeAuctions.at(_index);
        _loan = loans[ _id ];
    }

    //////

    function getActiveLoansCount() public view returns (uint) {
        return activeLoans.length();
    }

    /**
     * @dev may not work on huge amount of loans, in this case use version with limits
     */
    function getActiveLoans() public view returns (uint[] memory _ids, Loan[] memory _loans) {
        _ids = activeLoans.values();
        _loans = new Loan[](_ids.length);
        for (uint i=0; i<_ids.length; i++) {
            _loans[i] = loans[ _ids[i] ];
        }
    }

    function getActiveLoans(uint _offset, uint _limit) public view returns (uint[] memory _ids, Loan[] memory _loans) {
        _ids = new uint[](_limit);
        _loans = new Loan[](_limit);
        uint activeLoansCount = activeLoans.length();
        for (uint i = 0; i < _limit; i++) {
            if (_offset + i >= activeLoansCount) {
                break;
            }
            _ids[i] = activeLoans.at(i);
            _loans[i] = loans[ _ids[i] ];
        }
    }

    function getActiveLoan(uint _index) public view returns (uint _id, Loan memory _loan) {
        _id = activeLoans.at(_index);
        _loan = loans[ _id ];
    }

    //////

    function calcFeeAmount(address _asset, uint _amount) internal view returns (uint _feeAmount, uint _amountWithoutFee) {
        uint feeBasisPoints = parameters.getAssetFee(_asset);
        _feeAmount = _amount * feeBasisPoints / BASIS_POINTS_IN_1;
        _amountWithoutFee = _amount - _feeAmount;
    }

    function calcTotalDebt(uint debtAmount, uint interestRate, uint durationDays) internal pure returns (uint) {
        return debtAmount + debtAmount * interestRate * durationDays * 1 days / BASIS_POINTS_IN_1 / 365 days;
    }

    function calcCurrentInterestRate(uint auctionStartTS, uint auctionEndTs, uint16 interestRateMin, uint16 interestRateMax) internal view returns (uint16) {
        require(auctionStartTS <= block.timestamp && block.timestamp <= auctionEndTs, 'BROKEN_LOGIC');

        return interestRateMin + uint16((interestRateMax - interestRateMin) * (block.timestamp - auctionStartTS) / (auctionEndTs - auctionStartTS));
    }
}