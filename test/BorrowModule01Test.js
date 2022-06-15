const { expect } = require("chai");
const { ethers } = require("hardhat");

const ZERO = "0x0000000000000000000000000000000000000000";
const ONE = "0x0000000000000000000000000000000000000001";
const TWO = "0x0000000000000000000000000000000000000002";
const BN = ethers.BigNumber.from
const ether = x => ethers.utils.parseEther(x.toString());

const UINT_MAX = BN(2).pow(256).sub(1);

const COLLATERAL_TYPE_ERC20 = 0;
const COLLATERAL_TYPE_ERC721 = 1;

const PARAM_AUCTION_DURATION = 0;

let context;

// todo parameters storage tests
describe("BorrowModule01", function () {
    beforeEach(async function () {
        context = this;
        [this.deployer, this.user1, this.user2, this.user3, this.treasury] = await ethers.getSigners();

        this.erc20token1 = await deployContract("ERC20Token", UINT_MAX);
        this.erc20token2 = await deployContract("ERC20Token", UINT_MAX);
        this.erc20token3 = await deployContract("ERC20Token", UINT_MAX);
        this.erc20token4 = await deployContract("ERC20Token", UINT_MAX);

        this.erc721token1 = await deployContract("ERC721Token");
        this.erc721token2 = await deployContract("ERC721Token");
        this.erc721token3 = await deployContract("ERC721Token");
        this.erc721token4 = await deployContract("ERC721Token");

        this.parameters = await deployContract("ParametersStorage", this.treasury.address);
        await this.parameters.setCustomParamAsUint(PARAM_AUCTION_DURATION, 8 * 3600);

        this.module = await deployContract("BorrowModule01", this.parameters.address);
    });

    it("startAuction edge cases", async function () {
        await this.erc20token1.transfer(this.user1.address, UINT_MAX);
        await this.erc20token1.connect(this.user1).approve(this.module.address, UINT_MAX);

        ///////////

        await expect(
			this.module.connect(this.user1).startAuction(AuctionStartParams({durationDays: 0}))
		).to.be.revertedWith("INVALID_LOAN_DURATION");

        await expect(
			this.module.connect(this.user1).startAuction(AuctionStartParams({durationDays: 731}))
		).to.be.revertedWith("INVALID_LOAN_DURATION");

        await this.module.connect(this.user1).startAuction(AuctionStartParams({durationDays: 1}));
        await this.module.connect(this.user1).startAuction(AuctionStartParams({durationDays: 730}));

        ///////////

        await expect(
			this.module.connect(this.user1).startAuction(AuctionStartParams({interestRateMin: 0}))
		).to.be.revertedWith("INVALID_INTEREST_RATE");

        await expect(
			this.module.connect(this.user1).startAuction(AuctionStartParams({interestRateMax: 0}))
		).to.be.revertedWith("INVALID_INTEREST_RATE");

        await expect(
			this.module.connect(this.user1).startAuction(AuctionStartParams({interestRateMin: 11, interestRateMax: 10}))
		).to.be.revertedWith("INVALID_INTEREST_RATE");

        await this.module.connect(this.user1).startAuction(AuctionStartParams({interestRateMin: 1, interestRateMax: 1}));
        await this.module.connect(this.user1).startAuction(AuctionStartParams({interestRateMin: 1, interestRateMax: 65535}));

        ///////////

        await expect(
			this.module.connect(this.user1).startAuction(AuctionStartParams({collateral: ZERO}))
		).to.be.revertedWith("INVALID_COLLATERAL");

        await expect(
			this.module.connect(this.user1).startAuction(AuctionStartParams({collateralIdOrAmount: 0}))
		).to.be.revertedWith("INVALID_COLLATERAL");

        await this.module.connect(this.user1).startAuction(AuctionStartParams({collateralIdOrAmount: 1}));

        await this.erc20token2.transfer(this.user1.address, UINT_MAX);
        await this.erc20token2.connect(this.user1).approve(this.module.address, UINT_MAX);
        await this.module.connect(this.user1).startAuction(AuctionStartParams({collateral: this.erc20token2.address, collateralIdOrAmount: UINT_MAX}));

        ///////////

        await expect(
			this.module.connect(this.user1).startAuction(AuctionStartParams({debtCurrency: ZERO}))
		).to.be.revertedWith("INVALID_DEBT_CURRENCY");

        await expect(
			this.module.connect(this.user1).startAuction(AuctionStartParams({debtAmount: 0}))
		).to.be.revertedWith("INVALID_DEBT_CURRENCY");

        await this.module.connect(this.user1).startAuction(AuctionStartParams({debtAmount: 1}));

        await expect(
			this.module.connect(this.user1).startAuction(AuctionStartParams({debtAmount: UINT_MAX}))
		).to.be.revertedWith("Arithmetic operation underflowed or overflowed");

    })
});

function AuctionStartParams(params) {
    const template = {
        collateralType: COLLATERAL_TYPE_ERC20,
        durationDays: 30,

        interestRateMin: 100,
        interestRateMax: 1000,

        collateral: context.erc20token1.address,
        collateralIdOrAmount: ether(1),

        debtCurrency: context.erc20token2.address,
        debtAmount: ether('0.5')
    }

    return {...template, ...params}
}

async function deployContract(contract, ...params) {
    const Factory = await ethers.getContractFactory(contract);
    const instance = await Factory.deploy(...params);
    await instance.deployed();

    return instance;
}

