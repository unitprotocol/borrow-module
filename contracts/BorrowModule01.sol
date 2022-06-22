// SPDX-License-Identifier: bsl-1.1
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import "./Auth.sol";
import "./Parameters01.sol";
import "./Assets01.sol";


contract BorrowModule01 is Auth, ReentrancyGuard {
    using Parameters01 for IParametersStorage;
    using Assets01 for address;
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

        // slot 232
        LoanState state;
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
    mapping(address => uint[]) public loanIdsByUser;
    EnumerableSet.UintSet private activeAuctions;
    EnumerableSet.UintSet private activeLoans;

    constructor(address _parametersStorage) Auth(_parametersStorage) {}

    function startAuction(AuctionStartParams memory _params) external nonReentrant returns (uint _loanId) {
        require(0 < _params.durationDays &&_params.durationDays <= MAX_DURATION_DAYS, 'INVALID_LOAN_DURATION');
        require(0 < _params.interestRateMin && _params.interestRateMin <= _params.interestRateMax, 'INVALID_INTEREST_RATE');
        require(_params.collateral != address(0) && _params.collateralIdOrAmount > 0, 'INVALID_COLLATERAL');
        require(_params.debtCurrency != address(0) && _params.debtAmount > 0, 'INVALID_DEBT_CURRENCY');
        _calcTotalDebt(_params.debtAmount, _params.interestRateMax, _params.durationDays); // just check that there is no overflow on total debt

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

        _params.collateral.getFrom(msg.sender, address(this), _params.collateralIdOrAmount);

        emit AuctionStarted(_loanId, msg.sender);
    }

    function cancelAuction(uint _loanId) external nonReentrant {
        Loan storage loan = requireLoan(_loanId);
        require(loan.auctionInfo.borrower == msg.sender, 'AUTH_FAILED');

        changeLoanState(loan, LoanState.AuctionCancelled);
        require(activeAuctions.remove(_loanId), 'BROKEN_STRUCTURE');

        loan.collateral.sendTo(loan.auctionInfo.borrower, loan.collateralIdOrAmount);

        emit AuctionCancelled(_loanId, msg.sender);
    }

    /**
     * @dev acceptance after auction ended is allowed
     */
    function accept(uint _loanId) external nonReentrant {
        Loan storage loan = requireLoan(_loanId);

        require(loan.auctionInfo.borrower != msg.sender, 'OWN_AUCTION');

        changeLoanState(loan, LoanState.Issued);
        require(activeAuctions.remove(_loanId), 'BROKEN_STRUCTURE');
        require(activeLoans.add(_loanId), 'BROKEN_STRUCTURE');

        loan.startTS = uint32(block.timestamp);
        loan.lender = msg.sender;
        loan.interestRate = _calcCurrentInterestRate(loan.auctionInfo.startTS, loan.auctionInfo.interestRateMin, loan.auctionInfo.interestRateMax);

        loanIdsByUser[msg.sender].push(_loanId);

        (uint feeAmount, uint amountWithoutFee) = _calcFeeAmount(loan.debtCurrency, loan.debtAmount);

        loan.debtCurrency.getFrom(msg.sender, parameters.treasury(), feeAmount);
        loan.debtCurrency.getFrom(msg.sender, loan.auctionInfo.borrower, amountWithoutFee);

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

        uint totalDebt = _calcTotalDebt(loan.debtAmount, loan.interestRate, loan.durationDays);
        loan.debtCurrency.getFrom(msg.sender, loan.lender, totalDebt);
        loan.collateral.sendTo(loan.auctionInfo.borrower, loan.collateralIdOrAmount);

        emit LoanRepaid(_loanId, msg.sender);
    }

    function liquidate(uint _loanId) external nonReentrant {
        Loan storage loan = requireLoan(_loanId);

        changeLoanState(loan, LoanState.Liquidated);
        require(uint(loan.startTS) + uint(loan.durationDays) * 1 days < block.timestamp, 'LOAN_IS_ACTIVE');
        require(activeLoans.remove(_loanId), 'BROKEN_STRUCTURE');

        loan.collateral.sendTo(loan.lender, loan.collateralIdOrAmount);

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

    /**
     * @dev returns empty array with offset >= count
     */
    function getLoansLimited(uint _offset, uint _limit) external view returns(Loan[] memory _loans) {
        uint loansCount = loans.length;
        if (_offset > loansCount) {
            return new Loan[](0);
        }

        uint resultCount = Math.min(loansCount - _offset, _limit);
        _loans = new Loan[](resultCount);
        for (uint i = 0; i < resultCount; i++) {
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
        return _getLoansWithIds(activeAuctions);
    }

    /**
     * @dev returns empty arrays with offset >= count
     */
    function getActiveAuctionsLimited(uint _offset, uint _limit) public view returns (uint[] memory _ids, Loan[] memory _loans) {
        return _getLoansWithIdsLimited(activeAuctions, _offset, _limit);
    }

    //////

    function getActiveLoansCount() public view returns (uint) {
        return activeLoans.length();
    }

    /**
     * @dev may not work on huge amount of loans, in this case use version with limits
     */
    function getActiveLoans() public view returns (uint[] memory _ids, Loan[] memory _loans) {
        return _getLoansWithIds(activeLoans);
    }

    /**
     * @dev returns empty arrays with offset >= count
     */
    function getActiveLoansLimited(uint _offset, uint _limit) public view returns (uint[] memory _ids, Loan[] memory _loans) {
        return _getLoansWithIdsLimited(activeLoans, _offset, _limit);
    }

    //////

    function getUserLoansCount(address _user) public view returns (uint) {
        return loanIdsByUser[_user].length;
    }

    /**
     * @dev may not work on huge amount of loans, in this case use version with limits
     */
    function getUserLoans(address _user) external view returns(uint[] memory _ids, Loan[] memory _loans) {
        _ids = loanIdsByUser[_user];
        _loans = new Loan[](_ids.length);
        for (uint i=0; i<_ids.length; i++) {
            _loans[i] = loans[ _ids[i] ];
        }
    }

    /**
     * @dev returns empty arrays with offset >= count
     */
    function getUserLoansLimited(address _user, uint _offset, uint _limit) public view returns (uint[] memory _ids, Loan[] memory _loans) {
        uint loansCount = loanIdsByUser[_user].length;
        if (_offset > loansCount) {
            return (new uint[](0), new Loan[](0));
        }

        uint resultCount = Math.min(loansCount - _offset, _limit);
        _ids = new uint[](resultCount);
        _loans = new Loan[](resultCount);
        for (uint i = 0; i < resultCount; i++) {
            _ids[i] = loanIdsByUser[_user][_offset + i];
            _loans[i] = loans[ _ids[i] ];
        }
    }


    //////

    function _calcFeeAmount(address _asset, uint _amount) internal view returns (uint _feeAmount, uint _amountWithoutFee) {
        uint feeBasisPoints = parameters.getAssetFee(_asset);
        _feeAmount = _amount * feeBasisPoints / BASIS_POINTS_IN_1;
        _amountWithoutFee = _amount - _feeAmount;
    }

    function _calcTotalDebt(uint debtAmount, uint interestRateBasisPoints, uint durationDays) internal pure returns (uint) {
        return debtAmount + debtAmount * interestRateBasisPoints * durationDays * 1 days / BASIS_POINTS_IN_1 / 365 days;
    }

    function _calcCurrentInterestRate(uint auctionStartTS, uint16 interestRateMin, uint16 interestRateMax) internal view returns (uint16) {
        require(auctionStartTS < block.timestamp, 'TOO_EARLY');
        require(0 < interestRateMin && interestRateMin <= interestRateMax, 'INVALID_INTEREST_RATES'); // assert

        uint auctionEndTs = auctionStartTS + parameters.getAuctionDuration();
        uint onTime = Math.min(block.timestamp, auctionEndTs);

        return interestRateMin + uint16((interestRateMax - interestRateMin) * (onTime - auctionStartTS) / (auctionEndTs - auctionStartTS));
    }

    //////

    function _getLoansWithIds(EnumerableSet.UintSet storage _loansSet) internal view returns (uint[] memory _ids, Loan[] memory _loans) {
        _ids = _loansSet.values();
        _loans = new Loan[](_ids.length);
        for (uint i=0; i<_ids.length; i++) {
            _loans[i] = loans[ _ids[i] ];
        }
    }

    function _getLoansWithIdsLimited(EnumerableSet.UintSet storage _loansSet, uint _offset, uint _limit) internal view returns (uint[] memory _ids, Loan[] memory _loans) {
        uint loansCount = _loansSet.length();
        if (_offset > loansCount) {
            return (new uint[](0), new Loan[](0));
        }

        uint resultCount = Math.min(loansCount - _offset, _limit);
        _ids = new uint[](resultCount);
        _loans = new Loan[](resultCount);
        for (uint i = 0; i < resultCount; i++) {
            _ids[i] = _loansSet.at(_offset + i);
            _loans[i] = loans[ _ids[i] ];
        }
    }

    //////

    function onERC721Received(
        address operator,
        address /* from */,
        uint256 /* tokenId */,
        bytes calldata /* data */
    ) external view returns (bytes4) {
        require(operator == address(this), "TRANSFER_NOT_ALLOWED");

        return IERC721Receiver.onERC721Received.selector;
    }
}
