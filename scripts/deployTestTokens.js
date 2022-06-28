const hre = require("hardhat");
const {ethers} = require("hardhat");
const {deployContract} = require("./utils");

async function main() {
    const [deployer] = await ethers.getSigners();

    const erc20token1 = await deployContract("ERC20Token", 0);
    const erc20token2 = await deployContract("ERC20Token", 0);
    const erc20token3 = await deployContract("ERC20Token", 0);
    const erc20token4 = await deployContract("ERC20Token", 0);

    const erc721token1 = await deployContract("ERC721Token");
    const erc721token2 = await deployContract("ERC721Token");
    const erc721token3 = await deployContract("ERC721Token");
    const erc721token4 = await deployContract("ERC721Token");

    console.log("erc20: ", erc20token1.address, erc20token2.address, erc20token3.address, erc20token4.address);
    console.log("erc721: ", erc721token1.address, erc721token2.address, erc721token3.address, erc721token4.address);

    await new Promise(r => setTimeout(r, 100000)); // time to index new contracts

    await hre.run("verify:verify", {address: erc20token1.address, contract: "contracts/test-helpers/ERC20Token.sol:ERC20Token", constructorArguments: [0]});
    await hre.run("verify:verify", {address: erc20token2.address, contract: "contracts/test-helpers/ERC20Token.sol:ERC20Token", constructorArguments: [0]});
    await hre.run("verify:verify", {address: erc20token3.address, contract: "contracts/test-helpers/ERC20Token.sol:ERC20Token", constructorArguments: [0]});
    await hre.run("verify:verify", {address: erc20token4.address, contract: "contracts/test-helpers/ERC20Token.sol:ERC20Token", constructorArguments: [0]});

    await hre.run("verify:verify", {address: erc721token1.address, contract: "contracts/test-helpers/ERC721Token.sol:ERC721Token",});
    await hre.run("verify:verify", {address: erc721token2.address, contract: "contracts/test-helpers/ERC721Token.sol:ERC721Token",});
    await hre.run("verify:verify", {address: erc721token3.address, contract: "contracts/test-helpers/ERC721Token.sol:ERC721Token",});
    await hre.run("verify:verify", {address: erc721token4.address, contract: "contracts/test-helpers/ERC721Token.sol:ERC721Token",});
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
