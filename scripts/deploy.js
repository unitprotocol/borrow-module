const hre = require("hardhat");
const {ethers} = require("hardhat");
const {deployContract} = require("./utils");

const TREASURY = "0x0000000000000000000000000000000000000001";
const MANAGER = "0x0000000000000000000000000000000000000002";
const PARAM_AUCTION_DURATION = 0;

async function main() {
    const [deployer] = await ethers.getSigners();

    const parameters = await deployContract("ParametersStorage", TREASURY);
    console.log("ParametersStorage: ", parameters.address);

    const module = await deployContract("BorrowModule01", parameters.address);
    console.log("BorrowModule01: ", module.address);

    const viewer = await deployContract("AssetViewer");
    console.log("AssetViewer: ", viewer.address);

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

    await hre.run("verify:verify", {
        address: viewer.address,
        constructorArguments: [],
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
