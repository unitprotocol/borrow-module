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

        this.erc20token1 = await deployContract("ERC20Token", 'erc20 token1', 'e20t1', UINT_MAX);
        this.erc20token2 = await deployContract("ERC20Token", 'erc20 token2', 'e20t2', UINT_MAX);
        this.erc20token3 = await deployContract("ERC20Token", 'erc20 token3', 'e20t3', UINT_MAX);
        this.erc20token4 = await deployContract("ERC20Token", 'erc20 token4', 'e20t4', UINT_MAX);

        this.erc721token1 = await deployContract("ERC721Token", 'erc721 token1', 'e721t1');
        this.erc721token2 = await deployContract("ERC721Token", 'erc721 token2', 'e721t2');
        this.erc721token3 = await deployContract("ERC721Token", 'erc721 token3', 'e721t3');
        this.erc721token4 = await deployContract("ERC721Token", 'erc721 token4', 'e721t4');

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
            [this.borrower1.address, TYPE_UNKNOWN, 0, '', '', BN(0)],
            [this.erc20token1.address, TYPE_ERC20, 18, 'erc20 token1', 'e20t1', UINT_MAX],
            [this.erc20token2.address, TYPE_ERC20, 18, 'erc20 token2', 'e20t2', UINT_MAX],
            [this.erc20token3.address, TYPE_ERC20, 18, 'erc20 token3', 'e20t3', UINT_MAX],
            [this.erc20token4.address, TYPE_ERC20, 18, 'erc20 token4', 'e20t4', UINT_MAX],
            [this.lender1.address, TYPE_UNKNOWN, 0, '', '', BN(0)],
            [this.erc721token1.address, TYPE_ERC721, 0, 'erc721 token1', 'e721t1', BN(7)],
            [this.erc721token2.address, TYPE_ERC721, 0, 'erc721 token2', 'e721t2', BN(7)],
            [this.erc721token3.address, TYPE_ERC721, 0, 'erc721 token3', 'e721t3', BN(7)],
            [this.erc721token4.address, TYPE_ERC721, 0, 'erc721 token4', 'e721t4', BN(7)],
        ]);

        expect(await this.viewer.checkAssets(this.borrower1.address, assets)).deep.to.equal([
            [this.borrower1.address, TYPE_UNKNOWN, 0, '', '', BN(0)],
            [this.erc20token1.address, TYPE_ERC20, 18, 'erc20 token1', 'e20t1', BN(0)],
            [this.erc20token2.address, TYPE_ERC20, 18, 'erc20 token2', 'e20t2', BN(0)],
            [this.erc20token3.address, TYPE_ERC20, 18, 'erc20 token3', 'e20t3', BN(0)],
            [this.erc20token4.address, TYPE_ERC20, 18, 'erc20 token4', 'e20t4', BN(0)],
            [this.lender1.address, TYPE_UNKNOWN, 0, '', '', BN(0)],
            [this.erc721token1.address, TYPE_ERC721, 0, 'erc721 token1', 'e721t1', BN(0)],
            [this.erc721token2.address, TYPE_ERC721, 0, 'erc721 token2', 'e721t2', BN(0)],
            [this.erc721token3.address, TYPE_ERC721, 0, 'erc721 token3', 'e721t3', BN(0)],
            [this.erc721token4.address, TYPE_ERC721, 0, 'erc721 token4', 'e721t4', BN(0)],
        ]);

        await this.erc20token3.transfer(this.borrower1.address, ether(3));
        await this.erc721token3['safeTransferFrom(address,address,uint256)'](this.deployer.address, this.borrower1.address, 3);

        expect(await this.viewer.checkAssets(this.borrower1.address, assets)).deep.to.equal([
            [this.borrower1.address, TYPE_UNKNOWN, 0, '', '', BN(0)],
            [this.erc20token1.address, TYPE_ERC20, 18, 'erc20 token1', 'e20t1', BN(0)],
            [this.erc20token2.address, TYPE_ERC20, 18, 'erc20 token2', 'e20t2', BN(0)],
            [this.erc20token3.address, TYPE_ERC20, 18, 'erc20 token3', 'e20t3', ether(3)],
            [this.erc20token4.address, TYPE_ERC20, 18, 'erc20 token4', 'e20t4', BN(0)],
            [this.lender1.address, TYPE_UNKNOWN, 0, '', '', BN(0)],
            [this.erc721token1.address, TYPE_ERC721, 0, 'erc721 token1', 'e721t1', BN(0)],
            [this.erc721token2.address, TYPE_ERC721, 0, 'erc721 token2', 'e721t2', BN(0)],
            [this.erc721token3.address, TYPE_ERC721, 0, 'erc721 token3', 'e721t3', BN(1)],
            [this.erc721token4.address, TYPE_ERC721, 0, 'erc721 token4', 'e721t4', BN(0)],
        ]);

    })

});
