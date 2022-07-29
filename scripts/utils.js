const {ethers} = require("hardhat");

async function deployContract(contract, ...params) {
    const Factory = await ethers.getContractFactory(contract);
    const instance = await Factory.deploy(...params);
    await instance.deployed();

    return instance;
}

module.exports = {
    deployContract
}