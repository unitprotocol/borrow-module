const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

const lodash = require('lodash');
const {deployContract} = require("../scripts/utils");

const ZERO = "0x0000000000000000000000000000000000000000";
const ONE = "0x0000000000000000000000000000000000000001";
const TWO = "0x0000000000000000000000000000000000000002";
const BN = ethers.BigNumber.from
const ether = x => ethers.utils.parseEther(x.toString());

const UINT_MAX = BN(2).pow(256).sub(1);

const STATE_WAS_NOT_CREATED = 0;
const STATE_AUCTION_STARTED = 1;
const STATE_AUCTION_CANCELLED = 2;
const STATE_ISSUED = 3;
const STATE_FINISHED = 4;
const STATE_LIQUIDATED = 5;

const ASSET_TYPE_UNKNOWN = 0;
const ASSET_TYPE_ERC20 = 1;
const ASSET_TYPE_ERC721 = 2;

const PARAM_AUCTION_DURATION = 0;

const AUCTION_DURATION = 8 * 3600;

let context;

describe("BorrowModule", function () {
    beforeEach(async function () {
        context = this;
        [this.deployer, this.borrower1, this.borrower2, this.lender1, this.lender2, this.treasury, this.operatorTreasury] = await ethers.getSigners();

        this.erc20token1 = await deployContract("ERC20Token", UINT_MAX);
        this.erc20token2 = await deployContract("ERC20Token", UINT_MAX);
        this.erc20token3 = await deployContract("ERC20Token", UINT_MAX);
        this.erc20token4 = await deployContract("ERC20Token", UINT_MAX);

        this.erc721token1 = updateERC721(await deployContract("ERC721Token"));
        this.erc721token2 = updateERC721(await deployContract("ERC721Token"));
        this.erc721token3 = updateERC721(await deployContract("ERC721Token"));
        this.erc721token4 = updateERC721(await deployContract("ERC721Token"));

        this.parameters = await deployContract("ParametersStorage", this.treasury.address, this.operatorTreasury.address);
        await this.parameters.setCustomParamAsUint(PARAM_AUCTION_DURATION, AUCTION_DURATION);

        this.module = await deployContract("BorrowModuleMock", this.parameters.address); // in mock some internal methods are made public
    });

    it("borrow module interfaces", async function () {
        await expect(
            this.erc721token1.safeTransferFrom(this.deployer.address, this.module.address, 1)
		).to.be.revertedWith("TRANSFER_NOT_ALLOWED");
    })

    it("startAuction edge cases", async function () {
        await this.erc20token1.transfer(this.borrower1.address, UINT_MAX);
        await this.erc20token1.connect(this.borrower1).approve(this.module.address, UINT_MAX);

        ///////////

        await expect(
			this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams({durationDays: 0}))
		).to.be.revertedWith("INVALID_LOAN_DURATION");

        await expect(
			this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams({durationDays: 731}))
		).to.be.revertedWith("INVALID_LOAN_DURATION");

        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams({durationDays: 1}));
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams({durationDays: 730}));

        ///////////

        await expect(
			this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams({collateralType: ASSET_TYPE_UNKNOWN}))
		).to.be.revertedWith("UNSUPPORTED_ASSET_TYPE");

        await expect(
			this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams({collateralType: ASSET_TYPE_ERC721}))
		).to.be.revertedWith("WRONG_ASSET_TYPE");

        await expect(
			this.module.connect(this.borrower1).startAuction(ERC721AuctionStartParams({collateralType: ASSET_TYPE_ERC20}))
		).to.be.revertedWith("WRONG_ASSET_TYPE");

        ///////////

        await expect(
			this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams({interestRateMin: 0}))
		).to.be.revertedWith("INVALID_INTEREST_RATE");

        await expect(
			this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams({interestRateMax: 0}))
		).to.be.revertedWith("INVALID_INTEREST_RATE");

        await expect(
			this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams({interestRateMin: 11, interestRateMax: 10}))
		).to.be.revertedWith("INVALID_INTEREST_RATE");

        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams({interestRateMin: 1, interestRateMax: 1}));
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams({interestRateMin: 1, interestRateMax: 65535}));

        ///////////

        await expect(
			this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams({collateral: ZERO}))
		).to.be.revertedWith("INVALID_COLLATERAL");

        await expect(
			this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams({collateralIdOrAmount: 0}))
		).to.be.revertedWith("INVALID_COLLATERAL_AMOUNT");

        await this.erc721token1.safeTransferFrom(this.deployer.address, this.borrower1.address, 0);
        await this.erc721token1.connect(this.borrower1).approve(this.module.address, 0);
        await this.module.connect(this.borrower1).startAuction(ERC721AuctionStartParams({collateralIdOrAmount: 0}));

        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams({collateralIdOrAmount: 1}));

        await this.erc20token2.transfer(this.borrower1.address, UINT_MAX);
        await this.erc20token2.connect(this.borrower1).approve(this.module.address, UINT_MAX);
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams({collateral: this.erc20token2.address, collateralIdOrAmount: UINT_MAX}));

        ///////////

        await expect(
			this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams({debtCurrency: ZERO}))
		).to.be.revertedWith("INVALID_DEBT_CURRENCY");

        await expect(
			this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams({debtAmount: 0}))
		).to.be.revertedWith("INVALID_DEBT_CURRENCY");

        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams({debtAmount: 1}));

        await expect(
			this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams({debtAmount: UINT_MAX}))
		).to.be.revertedWith("Arithmetic operation underflowed or overflowed");
    });

    it("start auctions and check", async function () {
        await this.erc20token1.transfer(this.borrower1.address, ether(50));
        await this.erc20token1.connect(this.borrower1).approve(this.module.address, ether(50));
        await this.erc20token1.transfer(this.borrower2.address, ether(50));
        await this.erc20token1.connect(this.borrower2).approve(this.module.address, ether(50));
        await this.erc20token2.transfer(this.borrower1.address, ether(50));
        await this.erc20token2.connect(this.borrower1).approve(this.module.address, ether(50));

        await this.erc721token1.safeTransferFrom(this.deployer.address, this.borrower1.address, 1);
        await this.erc721token1.connect(this.borrower1).approve(this.module.address, 1);
        await this.erc721token1.safeTransferFrom(this.deployer.address, this.borrower2.address, 2);
        await this.erc721token1.connect(this.borrower2).approve(this.module.address, 2);
        await this.erc721token2.safeTransferFrom(this.deployer.address, this.borrower1.address, 1);
        await this.erc721token2.connect(this.borrower1).approve(this.module.address, 1);

        ///// initial checks of state
        expect(await this.erc20token1.balanceOf(this.module.address)).to.equal(0)
        expect(await this.erc20token1.balanceOf(this.borrower1.address)).to.equal(ether(50))
        expect(await this.erc721token1.ownerOf(1)).to.equal(this.borrower1.address)

        expect(await this.module.getLoansCount()).to.equal(0);
        expect(await this.module.getLoans()).to.deep.equal([])

        expect(await this.module.getActiveAuctionsCount()).to.equal(0);
        expect(normalize(await this.module.getActiveAuctions())).to.deep.equal([[], []])

        expect(await this.module.getActiveLoansCount()).to.equal(0);
        expect(normalize(await this.module.getActiveLoans())).to.deep.equal([[], []])

        expect(await this.module.getUserLoansCount(this.borrower1.address)).to.equal(0);
        expect(normalize(await this.module.getUserLoans(this.borrower1.address))).to.deep.equal([[], []]);

        expect(await this.module.getUserLoansCount(this.borrower2.address)).to.equal(0);
        expect(normalize(await this.module.getUserLoans(this.borrower2.address))).to.deep.equal([[], []]);

        ///// start auction with erc20 collateral
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());
        const loan0 = await ERC20Auction();

        expect(await this.erc20token1.balanceOf(this.module.address)).to.equal(ether(1))
        expect(await this.erc20token1.balanceOf(this.borrower1.address)).to.equal(ether(49))
        expect(await this.erc721token1.ownerOf(1)).to.equal(this.borrower1.address)

        expect(await this.module.getLoansCount()).to.equal(1);
        expect(normalize(await this.module.getLoans())).to.deep.equal([loan0])
        assert.deepEqual(toDict(await this.module.loans(0)), loan0)

        expect(await this.module.getActiveAuctionsCount()).to.equal(1);
        expect(normalize(await this.module.getActiveAuctions())).to.deep.equal([[0], [loan0]])

        expect(await this.module.getActiveLoansCount()).to.equal(0);
        expect(normalize(await this.module.getActiveLoans())).to.deep.equal([[], []])

        expect(await this.module.getUserLoansCount(this.borrower1.address)).to.equal(1);
        expect(normalize(await this.module.getUserLoans(this.borrower1.address))).to.deep.equal([[0], [loan0]]);

        expect(await this.module.getUserLoansCount(this.borrower2.address)).to.equal(0);
        expect(normalize(await this.module.getUserLoans(this.borrower2.address))).to.deep.equal([[], []]);


        ///// start auction with erc721 collateral
        await this.module.connect(this.borrower1).startAuction(ERC721AuctionStartParams());
        const loan1 = await ERC721Auction();

        expect(await this.erc20token1.balanceOf(this.module.address)).to.equal(ether(1))
        expect(await this.erc20token1.balanceOf(this.borrower1.address)).to.equal(ether(49))
        expect(await this.erc721token1.ownerOf(1)).to.equal(this.module.address)

        expect(await this.module.getLoansCount()).to.equal(2);
        expect(normalize(await this.module.getLoans())).to.deep.equal([loan0, loan1])
        assert.deepEqual(toDict(await this.module.loans(0)), loan0)
        assert.deepEqual(toDict(await this.module.loans(1)), loan1)

        expect(await this.module.getActiveAuctionsCount()).to.equal(2);
        expect(normalize(await this.module.getActiveAuctions())).to.deep.equal([[0, 1], [loan0, loan1]])

        expect(await this.module.getActiveLoansCount()).to.equal(0);
        expect(normalize(await this.module.getActiveLoans())).to.deep.equal([[], []])

        expect(await this.module.getUserLoansCount(this.borrower1.address)).to.equal(2);
        expect(normalize(await this.module.getUserLoans(this.borrower1.address))).to.deep.equal([[0, 1], [loan0, loan1]]);

        expect(await this.module.getUserLoansCount(this.borrower2.address)).to.equal(0);
        expect(normalize(await this.module.getUserLoans(this.borrower2.address))).to.deep.equal([[], []]);

        /////
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());
        const loan2 = await ERC20Auction();

        await this.module.connect(this.borrower2).startAuction(ERC20AuctionStartParams());
        const loan3 = await ERC20Auction({auctionInfo: {borrower: this.borrower2.address}});
        await this.module.connect(this.borrower2).startAuction(ERC721AuctionStartParams({collateralIdOrAmount: 2}));
        const loan4 = await ERC721Auction({auctionInfo: {borrower: this.borrower2.address}, collateralIdOrAmount: BN(2)});

        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams({collateral: this.erc20token2.address}));
        const loan5 = await ERC20Auction({collateral: this.erc20token2.address});
        await this.module.connect(this.borrower1).startAuction(ERC721AuctionStartParams({collateral: this.erc721token2.address}));
        const loan6 = await ERC721Auction({collateral: this.erc721token2.address});


        expect(await this.module.getLoansCount()).to.equal(7);
        expect(normalize(await this.module.getLoans())).to.deep.equal([loan0, loan1, loan2, loan3, loan4, loan5, loan6])
        assert.deepEqual(toDict(await this.module.loans(0)), loan0)
        assert.deepEqual(toDict(await this.module.loans(1)), loan1)
        assert.deepEqual(toDict(await this.module.loans(6)), loan6)

        expect(await this.module.getActiveAuctionsCount()).to.equal(7);
        expect(normalize(await this.module.getActiveAuctions())).to.deep.equal([[0, 1, 2, 3, 4, 5, 6], [loan0, loan1, loan2, loan3, loan4, loan5, loan6]])

        expect(await this.module.getActiveLoansCount()).to.equal(0);
        expect(normalize(await this.module.getActiveLoans())).to.deep.equal([[], []])

        expect(await this.module.getUserLoansCount(this.borrower1.address)).to.equal(5);
        expect(normalize(await this.module.getUserLoans(this.borrower1.address))).to.deep.equal([[0, 1, 2, 5, 6], [loan0, loan1, loan2, loan5, loan6]]);

        expect(await this.module.getUserLoansCount(this.borrower2.address)).to.equal(2);
        expect(normalize(await this.module.getUserLoans(this.borrower2.address))).to.deep.equal([[3, 4], [loan3, loan4]]);

        ///// limited
        expect(normalize(await this.module.getLoansLimited(0, 7))).to.deep.equal([loan0, loan1, loan2, loan3, loan4, loan5, loan6])
        expect(normalize(await this.module.getLoansLimited(0, 8))).to.deep.equal([loan0, loan1, loan2, loan3, loan4, loan5, loan6])
        expect(normalize(await this.module.getLoansLimited(1, 8))).to.deep.equal([loan1, loan2, loan3, loan4, loan5, loan6])
        expect(normalize(await this.module.getLoansLimited(1, 30))).to.deep.equal([loan1, loan2, loan3, loan4, loan5, loan6])
        expect(normalize(await this.module.getLoansLimited(5, 1))).to.deep.equal([loan5])
        expect(normalize(await this.module.getLoansLimited(5, 2))).to.deep.equal([loan5, loan6])
        expect(normalize(await this.module.getLoansLimited(5, 3))).to.deep.equal([loan5, loan6])
        expect(normalize(await this.module.getLoansLimited(6, 2))).to.deep.equal([loan6])
        expect(normalize(await this.module.getLoansLimited(0, 0))).to.deep.equal([])
        expect(normalize(await this.module.getLoansLimited(7, 2))).to.deep.equal([])
        expect(normalize(await this.module.getLoansLimited(8, 2))).to.deep.equal([])

        expect(normalize(await this.module.getActiveAuctionsLimited(0, 7))).to.deep.equal([[0, 1, 2, 3, 4, 5, 6], [loan0, loan1, loan2, loan3, loan4, loan5, loan6]])
        expect(normalize(await this.module.getActiveAuctionsLimited(0, 8))).to.deep.equal([[0, 1, 2, 3, 4, 5, 6], [loan0, loan1, loan2, loan3, loan4, loan5, loan6]])
        expect(normalize(await this.module.getActiveAuctionsLimited(1, 8))).to.deep.equal([[1, 2, 3, 4, 5, 6], [loan1, loan2, loan3, loan4, loan5, loan6]])
        expect(normalize(await this.module.getActiveAuctionsLimited(1, 30))).to.deep.equal([[1, 2, 3, 4, 5, 6], [loan1, loan2, loan3, loan4, loan5, loan6]])
        expect(normalize(await this.module.getActiveAuctionsLimited(5, 1))).to.deep.equal([[5], [loan5]])
        expect(normalize(await this.module.getActiveAuctionsLimited(5, 2))).to.deep.equal([[5, 6], [loan5, loan6]])
        expect(normalize(await this.module.getActiveAuctionsLimited(5, 3))).to.deep.equal([[5, 6], [loan5, loan6]])
        expect(normalize(await this.module.getActiveAuctionsLimited(6, 2))).to.deep.equal([[6], [loan6]])
        expect(normalize(await this.module.getActiveAuctionsLimited(0, 0))).to.deep.equal([[], []])
        expect(normalize(await this.module.getActiveAuctionsLimited(7, 2))).to.deep.equal([[], []])
        expect(normalize(await this.module.getActiveAuctionsLimited(8, 2))).to.deep.equal([[], []])

        expect(normalize(await this.module.getUserLoansLimited(this.borrower1.address, 0, 5))).to.deep.equal([[0, 1, 2, 5, 6], [loan0, loan1, loan2, loan5, loan6]]);
        expect(normalize(await this.module.getUserLoansLimited(this.borrower1.address, 0, 6))).to.deep.equal([[0, 1, 2, 5, 6], [loan0, loan1, loan2, loan5, loan6]]);
        expect(normalize(await this.module.getUserLoansLimited(this.borrower1.address, 1, 6))).to.deep.equal([[1, 2, 5, 6], [loan1, loan2, loan5, loan6]]);
        expect(normalize(await this.module.getUserLoansLimited(this.borrower1.address, 1, 30))).to.deep.equal([[1, 2, 5, 6], [loan1, loan2, loan5, loan6]]);
        expect(normalize(await this.module.getUserLoansLimited(this.borrower1.address, 3, 1))).to.deep.equal([[5], [loan5]]);
        expect(normalize(await this.module.getUserLoansLimited(this.borrower1.address, 3, 2))).to.deep.equal([[5, 6], [loan5, loan6]]);
        expect(normalize(await this.module.getUserLoansLimited(this.borrower1.address, 3, 3))).to.deep.equal([[5, 6], [loan5, loan6]]);
        expect(normalize(await this.module.getUserLoansLimited(this.borrower1.address, 4, 2))).to.deep.equal([[6], [loan6]]);
        expect(normalize(await this.module.getUserLoansLimited(this.borrower1.address, 0, 0))).to.deep.equal([[], []]);
        expect(normalize(await this.module.getUserLoansLimited(this.borrower1.address, 5, 2))).to.deep.equal([[], []]);
        expect(normalize(await this.module.getUserLoansLimited(this.borrower1.address, 6, 2))).to.deep.equal([[], []]);
    })

    it("cancelAuction edge cases", async function () {
        // for collateral
        await this.erc20token1.transfer(this.borrower1.address, ether(10000));
        await this.erc20token1.connect(this.borrower1).approve(this.module.address, ether(10000));

        // for accept auction
        await this.erc20token2.transfer(this.lender1.address, ether(10000));
        await this.erc20token2.connect(this.lender1).approve(this.module.address, ether(10000));

        // for repay
        await this.erc20token2.transfer(this.borrower1.address, ether(10000));
        await this.erc20token2.connect(this.borrower1).approve(this.module.address, ether(10000));

        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());

        ///////////

        await expect(
			this.module.connect(this.borrower1).cancelAuction(1)
		).to.be.revertedWith("INVALID_LOAN_ID");

        await expect(
			this.module.connect(this.borrower2).cancelAuction(0)
		).to.be.revertedWith("AUTH_FAILED");

        /////////// cancel already cancelled
        await this.module.connect(this.borrower1).cancelAuction(0)
        await expect(
			this.module.connect(this.borrower1).cancelAuction(0)
		).to.be.revertedWith("INVALID_LOAN_STATE");

        /////////// cancel issued
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());
        await this.module.connect(this.lender1).accept(1);
        await expect(
			this.module.connect(this.borrower1).cancelAuction(1)
		).to.be.revertedWith("INVALID_LOAN_STATE");

        /////////// cancel finished
        await this.module.connect(this.borrower1).repay(1);
        await expect(
			this.module.connect(this.borrower1).cancelAuction(1)
		).to.be.revertedWith("INVALID_LOAN_STATE");

        /////////// cancel liquidated
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());
        await this.module.connect(this.lender1).accept(2);
        await network.provider.send("evm_increaseTime", [366*24*3600]);
        await network.provider.send("evm_mine");
        await this.module.connect(this.lender1).liquidate(2);
        await expect(
			this.module.connect(this.borrower1).cancelAuction(2)
		).to.be.revertedWith("INVALID_LOAN_STATE");
    });

    it("cancelAuction", async function () {
        await this.erc20token1.transfer(this.borrower1.address, ether(50));
        await this.erc20token1.connect(this.borrower1).approve(this.module.address, ether(50));

        await this.erc721token1.safeTransferFrom(this.deployer.address, this.borrower1.address, 1);
        await this.erc721token1.connect(this.borrower1).approve(this.module.address, 1);

        ///// initial checks of state
        expect(await this.erc20token1.balanceOf(this.module.address)).to.equal(0)
        expect(await this.erc20token1.balanceOf(this.borrower1.address)).to.equal(ether(50))
        expect(await this.erc721token1.ownerOf(1)).to.equal(this.borrower1.address)

        ///// erc20 collateral
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());
        const loan0 = await ERC20Auction({state: STATE_AUCTION_CANCELLED});

        expect(await this.erc20token1.balanceOf(this.module.address)).to.equal(ether(1))
        expect(await this.erc20token1.balanceOf(this.borrower1.address)).to.equal(ether(49))
        expect(await this.module.getActiveAuctionsCount()).to.equal(1);

        await this.module.connect(this.borrower1).cancelAuction(0)
        expect(await this.erc20token1.balanceOf(this.module.address)).to.equal(ether(0))
        expect(await this.erc20token1.balanceOf(this.borrower1.address)).to.equal(ether(50))
        expect(await this.module.getActiveAuctionsCount()).to.equal(0);
        expect(toDict(await this.module.loans(0))).to.deep.equal(loan0)


        ///// erc721 collateral
        await this.module.connect(this.borrower1).startAuction(ERC721AuctionStartParams());
        const loan1 = await ERC721Auction({state: STATE_AUCTION_CANCELLED});

        expect(await this.erc721token1.ownerOf(1)).to.equal(this.module.address)
        expect(await this.module.getActiveAuctionsCount()).to.equal(1);

        await this.module.connect(this.borrower1).cancelAuction(1);
        expect(await this.erc721token1.ownerOf(1)).to.equal(this.borrower1.address)
        expect(await this.module.getActiveAuctionsCount()).to.equal(0);
        expect(toDict(await this.module.loans(1))).to.deep.equal(loan1)
    });

    it("updateInterestRateMax edge cases", async function () {
        // for collateral
        await this.erc20token1.transfer(this.borrower1.address, ether(10000));
        await this.erc20token1.connect(this.borrower1).approve(this.module.address, ether(10000));

        // for accept auction
        await this.erc20token2.transfer(this.lender1.address, ether(10000));
        await this.erc20token2.connect(this.lender1).approve(this.module.address, ether(10000));

        // for repay
        await this.erc20token2.transfer(this.borrower1.address, ether(10000));
        await this.erc20token2.connect(this.borrower1).approve(this.module.address, ether(10000));

        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());

        ///////////

        await expect(
			this.module.connect(this.borrower1).updateAuctionInterestRateMax(1, 5)
		).to.be.revertedWith("INVALID_LOAN_ID");

        await expect(
			this.module.connect(this.borrower2).updateAuctionInterestRateMax(0, 5)
		).to.be.revertedWith("AUTH_FAILED");

        /////////// update already cancelled
        await this.module.connect(this.borrower1).cancelAuction(0)
        await expect(
			this.module.connect(this.borrower1).updateAuctionInterestRateMax(0, 5)
		).to.be.revertedWith("INVALID_LOAN_STATE");

        /////////// cancel issued
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());
        await this.module.connect(this.lender1).accept(1);
        await expect(
			this.module.connect(this.borrower1).updateAuctionInterestRateMax(1, 5)
		).to.be.revertedWith("INVALID_LOAN_STATE");

        /////////// cancel finished
        await this.module.connect(this.borrower1).repay(1);
        await expect(
			this.module.connect(this.borrower1).updateAuctionInterestRateMax(1, 5)
		).to.be.revertedWith("INVALID_LOAN_STATE");

        /////////// cancel liquidated
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());
        await this.module.connect(this.lender1).accept(2);
        await network.provider.send("evm_increaseTime", [366*24*3600]);
        await network.provider.send("evm_mine");
        await this.module.connect(this.lender1).liquidate(2);
        await expect(
			this.module.connect(this.borrower1).updateAuctionInterestRateMax(2, 5)
		).to.be.revertedWith("INVALID_LOAN_STATE");

        ///////////
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());
        await expect(
			this.module.connect(this.borrower1).updateAuctionInterestRateMax(3, 5)
		).to.be.revertedWith("TOO_EARLY_UPDATE");

        ///////////
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());
        await network.provider.send("evm_increaseTime", [AUCTION_DURATION + 1]);
        await network.provider.send("evm_mine");
        await expect(
			this.module.connect(this.borrower1).updateAuctionInterestRateMax(3, 1000)
		).to.be.revertedWith("NEW_RATE_TOO_SMALL");
    });

    it("updateInterestRateMax", async function () {
        await this.erc20token1.transfer(this.borrower1.address, ether(50));
        await this.erc20token1.connect(this.borrower1).approve(this.module.address, ether(50));

        await this.erc20token2.transfer(this.lender1.address, ether(10000));
        await this.erc20token2.connect(this.lender1).approve(this.module.address, ether(10000));

        ///// erc20 collateral
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());

        await network.provider.send("evm_increaseTime", [AUCTION_DURATION + 1]);
        await network.provider.send("evm_mine");

        await this.module.connect(this.borrower1).updateAuctionInterestRateMax(0, 1001)

        await this.module.connect(this.lender1).accept(0);
        const loan = await ERC20Loan({auctionInfo: {startTS: await getBlockTs(null, -3), interestRateMax: 1001}, interestRate: 1001});

        expect(toDict(await this.module.loans(0))).to.deep.equal(loan)
    });

    it("accept edge cases", async function () {
        // for collateral
        await this.erc20token1.transfer(this.borrower1.address, ether(10000));
        await this.erc20token1.connect(this.borrower1).approve(this.module.address, ether(10000));

        // for accept auction
        await this.erc20token2.transfer(this.lender1.address, ether(10000));
        await this.erc20token2.connect(this.lender1).approve(this.module.address, ether(10000));

        // for repay
        await this.erc20token2.transfer(this.borrower1.address, ether(10000));
        await this.erc20token2.connect(this.borrower1).approve(this.module.address, ether(10000));

        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());

        ///////////

        await expect(
			this.module.connect(this.lender1).accept(1)
		).to.be.revertedWith("INVALID_LOAN_ID");

        await expect(
			this.module.connect(this.borrower1).accept(0)
		).to.be.revertedWith("OWN_AUCTION");

        /////////// accept already cancelled
        await this.module.connect(this.borrower1).cancelAuction(0)
        await expect(
			this.module.connect(this.lender1).accept(0)
		).to.be.revertedWith("INVALID_LOAN_STATE");

        /////////// accept accepted
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());
        await this.module.connect(this.lender1).accept(1);
        await expect(
			this.module.connect(this.lender1).accept(1)
		).to.be.revertedWith("INVALID_LOAN_STATE");

        /////////// accept finished
        await this.module.connect(this.borrower1).repay(1);
        await expect(
			this.module.connect(this.lender1).accept(1)
		).to.be.revertedWith("INVALID_LOAN_STATE");

        /////////// cancel liquidated
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());
        await this.module.connect(this.lender1).accept(2);
        await network.provider.send("evm_increaseTime", [366*24*3600]);
        await network.provider.send("evm_mine");
        await this.module.connect(this.lender1).liquidate(2);
        await expect(
			this.module.connect(this.lender1).accept(2)
		).to.be.revertedWith("INVALID_LOAN_STATE");
    });

    it("accept", async function () {
        await this.erc20token1.transfer(this.borrower1.address, ether(50));
        await this.erc20token1.connect(this.borrower1).approve(this.module.address, ether(50));

        await this.erc20token2.transfer(this.lender1.address, ether(50));
        await this.erc20token2.connect(this.lender1).approve(this.module.address, ether(50));

        await this.erc721token1.safeTransferFrom(this.deployer.address, this.borrower1.address, 1);
        await this.erc721token1.connect(this.borrower1).approve(this.module.address, 1);

        ///// initial checks of state
        expect(await this.erc20token1.balanceOf(this.module.address)).to.equal(0)
        expect(await this.erc20token1.balanceOf(this.borrower1.address)).to.equal(ether(50))
        expect(await this.erc20token2.balanceOf(this.module.address)).to.equal(0)
        expect(await this.erc20token2.balanceOf(this.treasury.address)).to.equal(0)
        expect(await this.erc20token2.balanceOf(this.operatorTreasury.address)).to.equal(0)
        expect(await this.erc20token2.balanceOf(this.lender1.address)).to.equal(ether(50))
        expect(await this.erc721token1.ownerOf(1)).to.equal(this.borrower1.address)

        expect(await this.module.getActiveAuctionsCount()).to.equal(0);
        expect(await this.module.getActiveLoansCount()).to.equal(0);

        ///// erc20 collateral
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());
        await this.module.connect(this.lender1).accept(0);
        const loan0 = await ERC20Loan();

        expect(await this.erc20token1.balanceOf(this.module.address)).to.equal(ether(1))
        expect(await this.erc20token1.balanceOf(this.borrower1.address)).to.equal(ether(49))
        expect(await this.erc20token2.balanceOf(this.module.address)).to.equal(0)
        expect(await this.erc20token2.balanceOf(this.lender1.address)).to.equal(ether(49.5))
        expect(await this.erc20token2.balanceOf(this.treasury.address)).to.equal(ether(0.0025))
        expect(await this.erc20token2.balanceOf(this.operatorTreasury.address)).to.equal(ether(0.0025))
        expect(await this.erc20token2.balanceOf(this.borrower1.address)).to.equal(ether(0.495))

        expect(await this.module.getActiveAuctionsCount()).to.equal(0);
        expect(await this.module.getActiveLoansCount()).to.equal(1);

        expect(normalize(await this.module.getLoans())).to.deep.equal([loan0])
        expect(normalize(await this.module.getActiveLoans())).to.deep.equal([[0], [loan0]])
        expect(normalize(await this.module.getUserLoans(this.borrower1.address))).to.deep.equal([[0], [loan0]])
        expect(normalize(await this.module.getUserLoans(this.lender1.address))).to.deep.equal([[0], [loan0]])

        ///// erc721 collateral
        await this.module.connect(this.borrower1).startAuction(ERC721AuctionStartParams());
        await this.module.connect(this.lender1).accept(1);
        const loan1 = await ERC721Loan();

        expect(await this.erc721token1.ownerOf(1)).to.equal(this.module.address)
        expect(await this.erc20token2.balanceOf(this.module.address)).to.equal(0)
        expect(await this.erc20token2.balanceOf(this.lender1.address)).to.equal(ether(49))
        expect(await this.erc20token2.balanceOf(this.treasury.address)).to.equal(ether(0.005))
        expect(await this.erc20token2.balanceOf(this.operatorTreasury.address)).to.equal(ether(0.005))
        expect(await this.erc20token2.balanceOf(this.borrower1.address)).to.equal(ether(0.99))

        expect(await this.module.getActiveAuctionsCount()).to.equal(0);
        expect(await this.module.getActiveLoansCount()).to.equal(2);

        expect(normalize(await this.module.getLoans())).to.deep.equal([loan0, loan1])
        expect(normalize(await this.module.getActiveLoans())).to.deep.equal([[0, 1], [loan0, loan1]])
        expect(normalize(await this.module.getUserLoans(this.borrower1.address))).to.deep.equal([[0, 1], [loan0, loan1]])
        expect(normalize(await this.module.getUserLoans(this.lender1.address))).to.deep.equal([[0, 1], [loan0, loan1]])
    });

    it("repay edge cases", async function () {
        // for collateral
        await this.erc20token1.transfer(this.borrower1.address, ether(10000));
        await this.erc20token1.connect(this.borrower1).approve(this.module.address, ether(10000));

        // for accept auction
        await this.erc20token2.transfer(this.lender1.address, ether(10000));
        await this.erc20token2.connect(this.lender1).approve(this.module.address, ether(10000));

        // for repay
        await this.erc20token2.transfer(this.borrower1.address, ether(10000));
        await this.erc20token2.connect(this.borrower1).approve(this.module.address, ether(10000));

        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());

        ///////////

        await expect(
			this.module.connect(this.borrower1).repay(1)
		).to.be.revertedWith("INVALID_LOAN_ID");

        /////////// repay not started
        await expect(
			this.module.connect(this.borrower1).repay(0)
		).to.be.revertedWith("INVALID_LOAN_STATE");

        /////////// repay cancelled
        await this.module.connect(this.borrower1).cancelAuction(0)
        await expect(
			this.module.connect(this.borrower1).repay(0)
		).to.be.revertedWith("INVALID_LOAN_STATE");

        /////////// repay accepted but with invalid user
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());
        await this.module.connect(this.lender1).accept(1);
        await expect(
			this.module.connect(this.borrower2).repay(1)
		).to.be.revertedWith("AUTH_FAILED");

        /////////// repay finished
        await this.module.connect(this.borrower1).repay(1);
        await expect(
			this.module.connect(this.borrower1).repay(1)
		).to.be.revertedWith("INVALID_LOAN_STATE");

        /////////// cancel liquidated
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());
        await this.module.connect(this.lender1).accept(2);
        await network.provider.send("evm_increaseTime", [366*24*3600]);
        await network.provider.send("evm_mine");
        await this.module.connect(this.lender1).liquidate(2);
        await expect(
			this.module.connect(this.borrower1).repay(2)
		).to.be.revertedWith("INVALID_LOAN_STATE");
    });

    it("repay", async function () {
        await this.erc20token1.transfer(this.borrower1.address, ether(50));
        await this.erc20token1.connect(this.borrower1).approve(this.module.address, ether(50));

        await this.erc20token2.transfer(this.lender1.address, ether(50));
        await this.erc20token2.connect(this.lender1).approve(this.module.address, ether(50));
        await this.erc20token2.transfer(this.borrower1.address, ether(50));
        await this.erc20token2.connect(this.borrower1).approve(this.module.address, ether(50));

        await this.erc721token1.safeTransferFrom(this.deployer.address, this.borrower1.address, 1);
        await this.erc721token1.connect(this.borrower1).approve(this.module.address, 1);

        ///// initial checks of state
        expect(await this.erc20token1.balanceOf(this.module.address)).to.equal(0)
        expect(await this.erc20token1.balanceOf(this.borrower1.address)).to.equal(ether(50))
        expect(await this.erc20token2.balanceOf(this.borrower1.address)).to.equal(ether(50))
        expect(await this.erc20token2.balanceOf(this.module.address)).to.equal(0)
        expect(await this.erc20token2.balanceOf(this.treasury.address)).to.equal(0)
        expect(await this.erc20token2.balanceOf(this.operatorTreasury.address)).to.equal(0)
        expect(await this.erc20token2.balanceOf(this.lender1.address)).to.equal(ether(50))
        expect(await this.erc721token1.ownerOf(1)).to.equal(this.borrower1.address)

        expect(await this.module.getActiveAuctionsCount()).to.equal(0);
        expect(await this.module.getActiveLoansCount()).to.equal(0);

        ///// erc20 collateral
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());
        await this.module.connect(this.lender1).accept(0);
        const loan0 = await ERC20Loan({state: STATE_FINISHED});
        await this.module.connect(this.borrower1).repay(0);

        expect(await this.erc20token1.balanceOf(this.module.address)).to.equal(0)
        expect(await this.erc20token1.balanceOf(this.borrower1.address)).to.equal(ether(50)) // returned
        expect(await this.erc20token2.balanceOf(this.borrower1.address)).to.equal(ether('49.945')) // sub interest (0.05) and fee (0.005)
        expect(await this.erc20token2.balanceOf(this.module.address)).to.equal(0)
        expect(await this.erc20token2.balanceOf(this.lender1.address)).to.equal(ether(50.05))
        expect(await this.erc20token2.balanceOf(this.treasury.address)).to.equal(ether(0.0025))
        expect(await this.erc20token2.balanceOf(this.operatorTreasury.address)).to.equal(ether(0.0025))

        expect(await this.module.getActiveAuctionsCount()).to.equal(0);
        expect(await this.module.getActiveLoansCount()).to.equal(0);

        expect(normalize(await this.module.getLoans())).to.deep.equal([loan0])
        expect(normalize(await this.module.getUserLoans(this.borrower1.address))).to.deep.equal([[0], [loan0]])
        expect(normalize(await this.module.getUserLoans(this.lender1.address))).to.deep.equal([[0], [loan0]])

        ///// erc721 collateral
        await this.module.connect(this.borrower1).startAuction(ERC721AuctionStartParams());
        await this.module.connect(this.lender1).accept(1);
        const loan1 = await ERC721Loan({state: STATE_FINISHED});
        await this.module.connect(this.borrower1).repay(1);

        expect(await this.erc721token1.ownerOf(1)).to.equal(this.borrower1.address)
        expect(await this.erc20token2.balanceOf(this.borrower1.address)).to.equal(ether('49.89')) // sub interest (0.05) and fee (0.005)
        expect(await this.erc20token2.balanceOf(this.module.address)).to.equal(0)
        expect(await this.erc20token2.balanceOf(this.lender1.address)).to.equal(ether(50.1))
        expect(await this.erc20token2.balanceOf(this.treasury.address)).to.equal(ether(0.005))
        expect(await this.erc20token2.balanceOf(this.operatorTreasury.address)).to.equal(ether(0.005))

        expect(await this.module.getActiveAuctionsCount()).to.equal(0);
        expect(await this.module.getActiveLoansCount()).to.equal(0);

        expect(normalize(await this.module.getLoans())).to.deep.equal([loan0, loan1])
        expect(normalize(await this.module.getUserLoans(this.borrower1.address))).to.deep.equal([[0, 1], [loan0, loan1]])
        expect(normalize(await this.module.getUserLoans(this.lender1.address))).to.deep.equal([[0, 1], [loan0, loan1]])
    });

    it("liquidate edge cases", async function () {
        // for collateral
        await this.erc20token1.transfer(this.borrower1.address, ether(10000));
        await this.erc20token1.connect(this.borrower1).approve(this.module.address, ether(10000));

        // for accept auction
        await this.erc20token2.transfer(this.lender1.address, ether(10000));
        await this.erc20token2.connect(this.lender1).approve(this.module.address, ether(10000));

        // for repay
        await this.erc20token2.transfer(this.borrower1.address, ether(10000));
        await this.erc20token2.connect(this.borrower1).approve(this.module.address, ether(10000));

        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());

        ///////////

        await expect(
			this.module.connect(this.lender1).liquidate(1)
		).to.be.revertedWith("INVALID_LOAN_ID");

        /////////// liquidate not started
        await expect(
			this.module.connect(this.lender1).liquidate(0)
		).to.be.revertedWith("INVALID_LOAN_STATE");

        /////////// liquidate cancelled
        await this.module.connect(this.borrower1).cancelAuction(0)
        await expect(
			this.module.connect(this.lender1).liquidate(0)
		).to.be.revertedWith("INVALID_LOAN_STATE");

        /////////// liquidate accepted but when active
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());
        await this.module.connect(this.lender1).accept(1);
        await expect(
			this.module.connect(this.lender1).liquidate(1)
		).to.be.revertedWith("LOAN_IS_ACTIVE");

        /////////// liquidate finished
        await this.module.connect(this.borrower1).repay(1);
        await expect(
			this.module.connect(this.lender1).liquidate(1)
		).to.be.revertedWith("INVALID_LOAN_STATE");

        /////////// liquidate liquidated
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());
        await this.module.connect(this.lender1).accept(2);
        await network.provider.send("evm_increaseTime", [366*24*3600]);
        await network.provider.send("evm_mine");
        await this.module.connect(this.lender1).liquidate(2);
        await expect(
			this.module.connect(this.lender1).liquidate(2)
		).to.be.revertedWith("INVALID_LOAN_STATE");
    });

    it("liquidate", async function () {
        await this.erc20token1.transfer(this.borrower1.address, ether(50));
        await this.erc20token1.connect(this.borrower1).approve(this.module.address, ether(50));

        await this.erc20token2.transfer(this.lender1.address, ether(50));
        await this.erc20token2.connect(this.lender1).approve(this.module.address, ether(50));

        await this.erc721token1.safeTransferFrom(this.deployer.address, this.borrower1.address, 1);
        await this.erc721token1.connect(this.borrower1).approve(this.module.address, 1);

        ///// initial checks of state
        expect(await this.erc20token1.balanceOf(this.module.address)).to.equal(0)
        expect(await this.erc20token1.balanceOf(this.borrower1.address)).to.equal(ether(50))
        expect(await this.erc20token2.balanceOf(this.module.address)).to.equal(0)
        expect(await this.erc20token2.balanceOf(this.treasury.address)).to.equal(0)
        expect(await this.erc20token2.balanceOf(this.operatorTreasury.address)).to.equal(0)
        expect(await this.erc20token2.balanceOf(this.lender1.address)).to.equal(ether(50))
        expect(await this.erc721token1.ownerOf(1)).to.equal(this.borrower1.address)

        expect(await this.module.getActiveAuctionsCount()).to.equal(0);
        expect(await this.module.getActiveLoansCount()).to.equal(0);

        ///// erc20 collateral
        await this.module.connect(this.borrower1).startAuction(ERC20AuctionStartParams());
        await this.module.connect(this.lender1).accept(0);
        const loan0 = await ERC20Loan({state: STATE_LIQUIDATED});
        await network.provider.send("evm_increaseTime", [366*24*3600]);
        await network.provider.send("evm_mine");
        await this.module.connect(this.lender1).liquidate(0);

        expect(await this.erc20token1.balanceOf(this.module.address)).to.equal(0)
        expect(await this.erc20token1.balanceOf(this.borrower1.address)).to.equal(ether(49))
        expect(await this.erc20token1.balanceOf(this.lender1.address)).to.equal(ether(1))
        expect(await this.erc20token2.balanceOf(this.borrower1.address)).to.equal(ether('0.495')) // sub fee (0.005)
        expect(await this.erc20token2.balanceOf(this.module.address)).to.equal(0)
        expect(await this.erc20token2.balanceOf(this.lender1.address)).to.equal(ether(49.5))
        expect(await this.erc20token2.balanceOf(this.treasury.address)).to.equal(ether(0.0025))
        expect(await this.erc20token2.balanceOf(this.operatorTreasury.address)).to.equal(ether(0.0025))

        expect(await this.module.getActiveAuctionsCount()).to.equal(0);
        expect(await this.module.getActiveLoansCount()).to.equal(0);

        expect(normalize(await this.module.getLoans())).to.deep.equal([loan0])
        expect(normalize(await this.module.getUserLoans(this.borrower1.address))).to.deep.equal([[0], [loan0]])
        expect(normalize(await this.module.getUserLoans(this.lender1.address))).to.deep.equal([[0], [loan0]])

        ///// erc721 collateral
        await this.module.connect(this.borrower1).startAuction(ERC721AuctionStartParams());
        await this.module.connect(this.lender1).accept(1);
        const loan1 = await ERC721Loan({state: STATE_LIQUIDATED});
        await network.provider.send("evm_increaseTime", [366*24*3600]);
        await network.provider.send("evm_mine");
        await this.module.connect(this.lender1).liquidate(1);

        expect(await this.erc721token1.ownerOf(1)).to.equal(this.lender1.address)
        expect(await this.erc20token2.balanceOf(this.borrower1.address)).to.equal(ether('0.99')) // sub fee (0.005) *2
        expect(await this.erc20token2.balanceOf(this.module.address)).to.equal(0)
        expect(await this.erc20token2.balanceOf(this.lender1.address)).to.equal(ether(49))
        expect(await this.erc20token2.balanceOf(this.treasury.address)).to.equal(ether(0.005))
        expect(await this.erc20token2.balanceOf(this.operatorTreasury.address)).to.equal(ether(0.005))

        expect(await this.module.getActiveAuctionsCount()).to.equal(0);
        expect(await this.module.getActiveLoansCount()).to.equal(0);

        expect(normalize(await this.module.getLoans())).to.deep.equal([loan0, loan1])
        expect(normalize(await this.module.getUserLoans(this.borrower1.address))).to.deep.equal([[0, 1], [loan0, loan1]])
        expect(normalize(await this.module.getUserLoans(this.lender1.address))).to.deep.equal([[0, 1], [loan0, loan1]])
    });

    describe('calc functions', async function () {
        it("_calcCurrentInterestRate", async function () {
            const blockTs = await getBlockTs();

            await expect(
                this.module._calcCurrentInterestRate_tests(blockTs, 10, 20)
            ).to.be.revertedWith("TOO_EARLY");

            await expect(
                this.module._calcCurrentInterestRate_tests(blockTs - 1, 10, 9)
            ).to.be.revertedWith("INVALID_INTEREST_RATES");

            // interest rates 100 1100
            const cases =  [
                [ blockTs-4*3600,  600, 'half'],
                [ blockTs-2*3600,  350, '1/4'],
                [ blockTs-1*3600,  225, '1/8'],
                [ blockTs-8*3600,  1100, 'end of period'],
                [ blockTs-8*3600 - 1,  1100, 'after auction finished'],
                [ blockTs-8*3600 - 10,  1100, 'after auction finished'],
                [ blockTs-80*3600,  1100, 'after auction finished'],
            ];

            for (const [auctionStartTS, result, case_] of cases) {
                expect(await this.module._calcCurrentInterestRate_tests(auctionStartTS, 100, 1100)).to.equal(result, case_);
            }
        });

        it("_calcTotalDebt", async function () {
            const cases =  [
                [ 1_000_000, 100, 365, 1_010_000, '1 year'],
                [ 1_000_000, 100, 2 * 365, 1_020_000, '2 year'],
                [ 1_000_000, 100, 30, 1_000_821, '1 month'],
                [ 1_000_000, 100, 1, 1_000_027, '1 day'],
                [ 1_000, 100, 30, 1_000, 'small debt, zero percent'],
            ];

            for (const [debtAmount, interestRateBasisPoints, durationDays, result, case_] of cases) {
                expect(await this.module._calcTotalDebt_tests(debtAmount, interestRateBasisPoints, durationDays)).to.equal(result, case_);
            }
        });

        it("_calcFeeAmount", async function () {
            await this.parameters.setAssetCustomFee(this.erc20token1.address, true, 0);
            await this.parameters.setAssetCustomFee(this.erc20token2.address, true, 100);

            const cases =  [
                [ this.erc20token1.address, 1_000_000, [BN(0), BN(0), BN(1_000_000)],  'no fee'],
                [ this.erc20token2.address, 1_000_000, [BN(5_000), BN(5_000), BN(990_000)],  'fee'],
                [ this.erc20token2.address, 10, [BN(0), BN(0), BN(10)],  'fee too small'],
            ];

            for (const [asset, amount, result, case_] of cases) {
                expect(await this.module._calcFeeAmount_tests(asset, amount)).to.deep.equal(result, case_);
            }

            await this.parameters.setOperatorFee(1);

            const cases2 =  [
                [ this.erc20token1.address, 1_000_000, [BN(0), BN(0), BN(1_000_000)],  'no fee'],
                [ this.erc20token2.address, 1_000_000, [BN(9_900), BN(100), BN(990_000)],  'fee'],
                [ this.erc20token2.address, 100, [BN(1), BN(0), BN(99)],  'operator fee too small'],
                [ this.erc20token2.address, 150, [BN(1), BN(0), BN(149)],  'operator fee too small 2'],
                [ this.erc20token2.address, 200, [BN(2), BN(0), BN(198)],  'operator fee too small 3'],
                [ this.erc20token2.address, 10, [BN(0), BN(0), BN(10)],  'fee too small'],
            ];

            for (const [asset, amount, result, case_] of cases2) {
                expect(await this.module._calcFeeAmount_tests(asset, amount)).to.deep.equal(result, case_);
            }
        });
    })
});

async function ERC20Auction(valuesToReplace = {}) {
    return lodash.merge(
        {
            auctionInfo: {
                borrower: context.borrower1.address,
                startTS: await getBlockTs(),
                interestRateMin: 1000,
                interestRateMax: 1000, // for simplicity, change of interest rate is tested additionally
            },
            state: STATE_AUCTION_STARTED,
            durationDays: 365, // for simplicity
            startTS: 0,
            interestRate: 0,
            collateral: context.erc20token1.address,
            collateralType: ASSET_TYPE_ERC20,
            collateralIdOrAmount: ether(1),
            lender: ZERO,
            debtCurrency: context.erc20token2.address,
            debtAmount: ether(0.5),
        },
        valuesToReplace
    )
}

async function ERC721Auction(valuesToReplace = {}) {
    return lodash.merge(
        await ERC20Auction(),
        {
            collateral: context.erc721token1.address,
            collateralType: ASSET_TYPE_ERC721,
            collateralIdOrAmount: BN(1),
        },
        valuesToReplace
    )
}

async function ERC20Loan(valuesToReplace = {}) {
    return lodash.merge(
        await ERC20Auction(),
        {
            auctionInfo:{
                startTS: await getPrevBlockTs(), // common case when start and accept are in consequent blocks
            },
            state: STATE_ISSUED,
            startTS: await getBlockTs(),
            lender: context.lender1.address,
            interestRate: 1000,
        },
        valuesToReplace
    )
}

async function ERC721Loan(valuesToReplace = {}) {
    return lodash.merge(
        await ERC20Loan(),
        {
            collateral: context.erc721token1.address,
            collateralType: ASSET_TYPE_ERC721,
            collateralIdOrAmount: BN(1),
        },
        valuesToReplace
    )
}


function ERC20AuctionStartParams(paramsToReplace) {
    const template = {
        durationDays: 365,

        interestRateMin: 1000,
        interestRateMax: 1000,

        collateral: context.erc20token1.address,
        collateralType: ASSET_TYPE_ERC20,
        collateralIdOrAmount: ether(1),

        debtCurrency: context.erc20token2.address,
        debtAmount: ether('0.5')
    }

    return {...template, ...paramsToReplace}
}

function ERC721AuctionStartParams(paramsToReplace) {

    return {
        ...ERC20AuctionStartParams(),
        ... {
            collateral: context.erc721token1.address,
            collateralType: ASSET_TYPE_ERC721,
            collateralIdOrAmount: 1,
        },
        ...paramsToReplace
    }
}

async function getBlockTs(blockNumber = null, blockNumberRelative = null) {
    const calcedBlockNumber = blockNumber ?? await ethers.provider.getBlockNumber();
    return (await ethers.provider.getBlock(calcedBlockNumber + (blockNumberRelative ?? 0) )).timestamp;
}

async function getPrevBlockTs() {
    return (await ethers.provider.getBlock((await ethers.provider.getBlockNumber()) - 1)).timestamp;
}

function toDict(ethersResult) {
    if (!Array.isArray(ethersResult)) {
        return;
    }
    return Object.fromEntries(
        Object.entries({...ethersResult})
            .filter(([k, v]) => isNaN(k))
            .map(([k, v]) => Array.isArray(v) ? [k, toDict(v)] : [k, v])
    );
}

// not very consistent method for normalization of array of loans or [ids, loans] struct
// array if loans - num keys from loans is removed
// [ids, loans] -> string keys '_ids' and '_loans' is removed, internal loans are normalized
function normalize(returnedStruct) {
    if (returnedStruct._ids !== undefined) {
        returnedStruct = [returnedStruct[0].map(x=>x.toNumber()), returnedStruct[1].map(toDict)]
    } else {
        returnedStruct = returnedStruct.map(toDict)
    }
    return returnedStruct
}

/**
 * add some shortcuts
 * @param contract
 */
function updateERC721(contract) {
    contract.safeTransferFrom = contract['safeTransferFrom(address,address,uint256)']
    return contract
}