const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

const lodash = require('lodash');
const {deployContract} = require("../../scripts/utils");

const BN = ethers.BigNumber.from
const ether = x => ethers.utils.parseEther(x.toString());

const UINT_MAX = BN(2).pow(256).sub(1);

const TYPE_UNKNOWN = 0;
const TYPE_ERC20 = 1;
const TYPE_ERC721 = 2;

let context;

describe("AssetViewer", function () {
    beforeEach(async function () {
        context = this;
        [this.deployer, this.borrower1, this.borrower2, this.lender1, this.lender2, this.treasury] = await ethers.getSigners();

        this.erc20token1 = await deployContract("ERC20Token", UINT_MAX);
        this.erc20token2 = await deployContract("ERC20Token", UINT_MAX);
        this.erc20token3 = await deployContract("ERC20Token", UINT_MAX);
        this.erc20token4 = await deployContract("ERC20Token", UINT_MAX);

        this.erc721token1 = await deployContract("ERC721Token");
        this.erc721token2 = await deployContract("ERC721Token");
        this.erc721token3 = await deployContract("ERC721Token");
        this.erc721token4 = await deployContract("ERC721Token");

        this.viewer = await deployContract("AssetViewer");
    });

    it("check", async function () {
        const assets = [
            this.borrower1.address,
            this.erc20token1.address,
            this.erc20token2.address,
            this.erc20token3.address,
            this.erc20token4.address,
            this.lender1.address,
            this.erc721token1.address,
            this.erc721token2.address,
            this.erc721token3.address,
            this.erc721token4.address,
        ];
        expect(await this.viewer.checkAssets(this.deployer.address, assets)).deep.to.equal([
            [this.borrower1.address, TYPE_UNKNOWN, BN(0)],
            [this.erc20token1.address, TYPE_ERC20, UINT_MAX],
            [this.erc20token2.address, TYPE_ERC20, UINT_MAX],
            [this.erc20token3.address, TYPE_ERC20, UINT_MAX],
            [this.erc20token4.address, TYPE_ERC20, UINT_MAX],
            [this.lender1.address, TYPE_UNKNOWN, BN(0)],
            [this.erc721token1.address, TYPE_ERC721, BN(6)],
            [this.erc721token2.address, TYPE_ERC721, BN(6)],
            [this.erc721token3.address, TYPE_ERC721, BN(6)],
            [this.erc721token4.address, TYPE_ERC721, BN(6)],
        ]);

        expect(await this.viewer.checkAssets(this.borrower1.address, assets)).deep.to.equal([
            [this.borrower1.address, TYPE_UNKNOWN, BN(0)],
            [this.erc20token1.address, TYPE_ERC20, BN(0)],
            [this.erc20token2.address, TYPE_ERC20, BN(0)],
            [this.erc20token3.address, TYPE_ERC20, BN(0)],
            [this.erc20token4.address, TYPE_ERC20, BN(0)],
            [this.lender1.address, TYPE_UNKNOWN, BN(0)],
            [this.erc721token1.address, TYPE_ERC721, BN(0)],
            [this.erc721token2.address, TYPE_ERC721, BN(0)],
            [this.erc721token3.address, TYPE_ERC721, BN(0)],
            [this.erc721token4.address, TYPE_ERC721, BN(0)],
        ]);

        await this.erc20token3.transfer(this.borrower1.address, ether(3));
        await this.erc721token3['safeTransferFrom(address,address,uint256)'](this.deployer.address, this.borrower1.address, 3);

        expect(await this.viewer.checkAssets(this.borrower1.address, assets)).deep.to.equal([
            [this.borrower1.address, TYPE_UNKNOWN, BN(0)],
            [this.erc20token1.address, TYPE_ERC20, BN(0)],
            [this.erc20token2.address, TYPE_ERC20, BN(0)],
            [this.erc20token3.address, TYPE_ERC20, ether(3)],
            [this.erc20token4.address, TYPE_ERC20, BN(0)],
            [this.lender1.address, TYPE_UNKNOWN, BN(0)],
            [this.erc721token1.address, TYPE_ERC721, BN(0)],
            [this.erc721token2.address, TYPE_ERC721, BN(0)],
            [this.erc721token3.address, TYPE_ERC721, BN(1)],
            [this.erc721token4.address, TYPE_ERC721, BN(0)],
        ]);

    })

});
