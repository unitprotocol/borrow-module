const { expect } = require("chai");
const { ethers } = require("hardhat");

const {deployContract} = require("../scripts/utils");

const ZERO = "0x0000000000000000000000000000000000000000";
const ONE = "0x0000000000000000000000000000000000000001";
const TWO = "0x0000000000000000000000000000000000000002";
const BYTES32_ZERO = "0x0000000000000000000000000000000000000000000000000000000000000000";
const BYTES32_ONE = "0x0000000000000000000000000000000000000000000000000000000000000001";
const BYTES32_TWO = "0x0000000000000000000000000000000000000000000000000000000000000002";

let context;

describe("ParametersStorage", function () {
    beforeEach(async function () {
        context = this;
        [this.deployer, this.borrower1, this.borrower2, this.lender1, this.lender2, this.treasury] = await ethers.getSigners();

        this.parameters = await deployContract("ParametersStorage", this.treasury.address);

    });

    it("deploy", async function () {
        expect(await this.parameters.treasury()).to.equal(this.treasury.address);
        expect(await this.parameters.isManager(this.deployer.address)).to.be.true;
        expect(await this.parameters.isManager(this.borrower1.address)).to.be.false;
    });

    it("auth negative", async function () {
        await expect(
            this.parameters.connect(this.borrower1).setManager(ONE, true)
		).to.be.revertedWith("AUTH_FAILED");


        await expect(
            this.parameters.connect(this.borrower1).setTreasury(ONE)
		).to.be.revertedWith("AUTH_FAILED");

        await expect(
            this.parameters.connect(this.borrower1).setBaseFee(33)
		).to.be.revertedWith("AUTH_FAILED");

        await expect(
            this.parameters.connect(this.borrower1).setAssetCustomFee(ONE, true, 33)
		).to.be.revertedWith("AUTH_FAILED");

        await expect(
            this.parameters.connect(this.borrower1).setCustomParam(1, BYTES32_ONE)
		).to.be.revertedWith("AUTH_FAILED");

        await expect(
            this.parameters.connect(this.borrower1).setCustomParamAsUint(1, 123)
		).to.be.revertedWith("AUTH_FAILED");

        await expect(
            this.parameters.connect(this.borrower1).setCustomParamAsAddress(1, TWO)
		).to.be.revertedWith("AUTH_FAILED");

        await expect(
            this.parameters.connect(this.borrower1).setAssetCustomParam(ONE, 1, BYTES32_ONE)
		).to.be.revertedWith("AUTH_FAILED");

        await expect(
            this.parameters.connect(this.borrower1).setAssetCustomParamAsUint(ONE, 1, 123)
		).to.be.revertedWith("AUTH_FAILED");

        await expect(
            this.parameters.connect(this.borrower1).setAssetCustomParamAsAddress(ONE, 1, TWO)
		).to.be.revertedWith("AUTH_FAILED");
    })

    it("setManager", async function () {
        await this.parameters.connect(this.deployer).setTreasury(ONE)
        await expect(
            this.parameters.connect(this.borrower1).setTreasury(ONE)
		).to.be.revertedWith("AUTH_FAILED");

        await this.parameters.connect(this.deployer).setManager(this.borrower1.address, true)

        await this.parameters.connect(this.deployer).setTreasury(ONE)
        await this.parameters.connect(this.borrower1).setTreasury(ONE)

        await this.parameters.connect(this.deployer).setManager(this.deployer.address, false)

        await this.parameters.connect(this.borrower1).setTreasury(ONE)
        await expect(
            this.parameters.connect(this.deployer).setTreasury(ONE)
		).to.be.revertedWith("AUTH_FAILED");

        await this.parameters.connect(this.borrower1).setManager(this.borrower1.address, false)
        await expect(
            this.parameters.connect(this.borrower1).setTreasury(ONE)
		).to.be.revertedWith("AUTH_FAILED");
        await expect(
            this.parameters.connect(this.deployer).setTreasury(ONE)
		).to.be.revertedWith("AUTH_FAILED");
    });

    it("setTreasury", async function () {
        await this.parameters.connect(this.deployer).setTreasury(ONE)
        expect(await this.parameters.treasury()).to.equal(ONE);

        await this.parameters.connect(this.deployer).setTreasury(TWO)
        expect(await this.parameters.treasury()).to.equal(TWO);

        await expect(
            this.parameters.connect(this.deployer).setTreasury(ZERO)
		).to.be.revertedWith("ZERO_ADDRESS");
    });

    it("fees", async function () {
        expect(await this.parameters.baseFeeBasisPoints()).to.equal(100);
        expect(await this.parameters.assetCustomFee(ONE)).deep.to.equal([false, 0]);
        expect(await this.parameters.assetCustomFee(TWO)).deep.to.equal([false, 0]);
        expect(await this.parameters.getAssetFee(ONE)).to.equal(100);
        expect(await this.parameters.getAssetFee(TWO)).to.equal(100);

        await this.parameters.connect(this.deployer).setAssetCustomFee(TWO, true, 200)

        expect(await this.parameters.baseFeeBasisPoints()).to.equal(100);
        expect(await this.parameters.assetCustomFee(ONE)).deep.to.equal([false, 0]);
        expect(await this.parameters.assetCustomFee(TWO)).deep.to.equal([true, 200]);
        expect(await this.parameters.getAssetFee(ONE)).to.equal(100);
        expect(await this.parameters.getAssetFee(TWO)).to.equal(200);

        await this.parameters.connect(this.deployer).setBaseFee(300)

        expect(await this.parameters.baseFeeBasisPoints()).to.equal(300);
        expect(await this.parameters.assetCustomFee(ONE)).deep.to.equal([false, 0]);
        expect(await this.parameters.assetCustomFee(TWO)).deep.to.equal([true, 200]);
        expect(await this.parameters.getAssetFee(ONE)).to.equal(300);
        expect(await this.parameters.getAssetFee(TWO)).to.equal(200);

        await this.parameters.connect(this.deployer).setAssetCustomFee(TWO, false, 0)

        expect(await this.parameters.baseFeeBasisPoints()).to.equal(300);
        expect(await this.parameters.assetCustomFee(ONE)).deep.to.equal([false, 0]);
        expect(await this.parameters.assetCustomFee(TWO)).deep.to.equal([false, 0]);
        expect(await this.parameters.getAssetFee(ONE)).to.equal(300);
        expect(await this.parameters.getAssetFee(TWO)).to.equal(300);
    });

    it("custom params", async function () {
        expect(await this.parameters.customParams(0)).to.equal(BYTES32_ZERO);
        expect(await this.parameters.customParams(1)).to.equal(BYTES32_ZERO);
        expect(await this.parameters.assetCustomParams(ONE, 0)).to.equal(BYTES32_ZERO);
        expect(await this.parameters.assetCustomParams(ONE, 1)).to.equal(BYTES32_ZERO);
        expect(await this.parameters.assetCustomParams(TWO, 0)).to.equal(BYTES32_ZERO);
        expect(await this.parameters.assetCustomParams(TWO, 1)).to.equal(BYTES32_ZERO);

        await this.parameters.connect(this.deployer).setAssetCustomParam(ONE, 0, BYTES32_ONE)

        expect(await this.parameters.customParams(0)).to.equal(BYTES32_ZERO);
        expect(await this.parameters.customParams(1)).to.equal(BYTES32_ZERO);
        expect(await this.parameters.assetCustomParams(ONE, 0)).to.equal(BYTES32_ONE);
        expect(await this.parameters.assetCustomParams(ONE, 1)).to.equal(BYTES32_ZERO);
        expect(await this.parameters.assetCustomParams(TWO, 0)).to.equal(BYTES32_ZERO);
        expect(await this.parameters.assetCustomParams(TWO, 1)).to.equal(BYTES32_ZERO);

        await this.parameters.connect(this.deployer).setAssetCustomParamAsUint(TWO, 1, 2)

        expect(await this.parameters.customParams(0)).to.equal(BYTES32_ZERO);
        expect(await this.parameters.customParams(1)).to.equal(BYTES32_ZERO);
        expect(await this.parameters.assetCustomParams(ONE, 0)).to.equal(BYTES32_ONE);
        expect(await this.parameters.assetCustomParams(ONE, 1)).to.equal(BYTES32_ZERO);
        expect(await this.parameters.assetCustomParams(TWO, 0)).to.equal(BYTES32_ZERO);
        expect(await this.parameters.assetCustomParams(TWO, 1)).to.equal(BYTES32_TWO);

        await this.parameters.connect(this.deployer).setAssetCustomParamAsAddress(TWO, 0, ONE)

        expect(await this.parameters.customParams(0)).to.equal(BYTES32_ZERO);
        expect(await this.parameters.customParams(1)).to.equal(BYTES32_ZERO);
        expect(await this.parameters.assetCustomParams(ONE, 0)).to.equal(BYTES32_ONE);
        expect(await this.parameters.assetCustomParams(ONE, 1)).to.equal(BYTES32_ZERO);
        expect(await this.parameters.assetCustomParams(TWO, 0)).to.equal(BYTES32_ONE);
        expect(await this.parameters.assetCustomParams(TWO, 1)).to.equal(BYTES32_TWO);

        await this.parameters.connect(this.deployer).setCustomParam(0, BYTES32_ONE)

        expect(await this.parameters.customParams(0)).to.equal(BYTES32_ONE);
        expect(await this.parameters.customParams(1)).to.equal(BYTES32_ZERO);
        expect(await this.parameters.assetCustomParams(ONE, 0)).to.equal(BYTES32_ONE);
        expect(await this.parameters.assetCustomParams(ONE, 1)).to.equal(BYTES32_ZERO);
        expect(await this.parameters.assetCustomParams(TWO, 0)).to.equal(BYTES32_ONE);
        expect(await this.parameters.assetCustomParams(TWO, 1)).to.equal(BYTES32_TWO);

        await this.parameters.connect(this.deployer).setCustomParamAsUint(1, 2)

        expect(await this.parameters.customParams(0)).to.equal(BYTES32_ONE);
        expect(await this.parameters.customParams(1)).to.equal(BYTES32_TWO);
        expect(await this.parameters.assetCustomParams(ONE, 0)).to.equal(BYTES32_ONE);
        expect(await this.parameters.assetCustomParams(ONE, 1)).to.equal(BYTES32_ZERO);
        expect(await this.parameters.assetCustomParams(TWO, 0)).to.equal(BYTES32_ONE);
        expect(await this.parameters.assetCustomParams(TWO, 1)).to.equal(BYTES32_TWO);

        await this.parameters.connect(this.deployer).setCustomParamAsAddress(1, ONE)

        expect(await this.parameters.customParams(0)).to.equal(BYTES32_ONE);
        expect(await this.parameters.customParams(1)).to.equal(BYTES32_ONE);
        expect(await this.parameters.assetCustomParams(ONE, 0)).to.equal(BYTES32_ONE);
        expect(await this.parameters.assetCustomParams(ONE, 1)).to.equal(BYTES32_ZERO);
        expect(await this.parameters.assetCustomParams(TWO, 0)).to.equal(BYTES32_ONE);
        expect(await this.parameters.assetCustomParams(TWO, 1)).to.equal(BYTES32_TWO);
    });

});
