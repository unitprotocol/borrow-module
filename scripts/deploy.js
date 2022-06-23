const hre = require("hardhat");
const {ethers} = require("hardhat");

const TREASURY = "0x0000000000000000000000000000000000000001";
const MANAGER = "0x0000000000000000000000000000000000000002";
const PARAM_AUCTION_DURATION = 0;

async function main() {
    const [deployer] = await ethers.getSigners();

    const ParametersStorageFactory = await ethers.getContractFactory("ParametersStorage");
    const parameters = await ParametersStorageFactory.deploy(TREASURY);
    await parameters.deployed();
    console.log("ParametersStorage: ", parameters.address);

    const BorrowModule01Factory = await ethers.getContractFactory("BorrowModule01");
    const module = await BorrowModule01Factory.deploy(parameters.address);
    await module.deployed();
    console.log("BorrowModule01: ", module.address);

    await parameters.setCustomParamAsUint(PARAM_AUCTION_DURATION, 2 * 3600);
    await parameters.setManager(MANAGER, true);
    await parameters.setManager(deployer.address, false);

    await new Promise(r => setTimeout(r, 100000)); // time to index new contracts

    await hre.run("verify:verify", {
        address: parameters.address,
        constructorArguments: [TREASURY],
    });

    await hre.run("verify:verify", {
        address: module.address,
        constructorArguments: [parameters.address],
    });

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
