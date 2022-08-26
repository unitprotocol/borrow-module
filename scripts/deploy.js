const hre = require("hardhat");
const {ethers} = require("hardhat");
const {deployContract} = require("./utils");

const MANAGER = "0x0000000000000000000000000000000000000001";
const TREASURY_OPERATOR = "0x0000000000000000000000000000000000000002";
const TREASURY_COMMUNITY = "0x0000000000000000000000000000000000000003";
const PARAM_AUCTION_DURATION = 0;

async function main() {
    const [deployer] = await ethers.getSigners();

    const parameters = await deployContract("ParametersStorage", TREASURY_COMMUNITY, TREASURY_OPERATOR);

    const module = await deployContract("BorrowModule", parameters.address);
    console.log("BorrowModule: ", module.address);
    console.log("ParametersStorage: ", parameters.address);

    const viewer = await deployContract("AssetViewer");
    console.log("AssetViewer: ", viewer.address);


    let res = await parameters.setCustomParamAsUint(PARAM_AUCTION_DURATION, 2 * 3600);
    await res.wait();
    res = await parameters.setManager(MANAGER, true);
    await res.wait();
    res = await parameters.setManager(deployer.address, false);
    await res.wait();

    console.log("Setup finished");

    await new Promise(r => setTimeout(r, 100000)); // time to index new contracts

    await hre.run("verify:verify", {
        address: parameters.address,
        constructorArguments: [TREASURY_COMMUNITY, TREASURY_OPERATOR],
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
