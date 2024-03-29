require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: {
        version: "0.8.14",
        settings: {
            optimizer: {
                enabled: true,
                runs: 10_000,
            },
        },
    },

    mocha: {
        timeout: 180000,
    },

    etherscan: {
        // Your API key for Etherscan
        // Obtain one at https://etherscan.io/
        apiKey: "KEY",
        customChains: [
            {
                chainId: 199,
                urls: {
                    apiURL: "https://api.bttcscan.com/api",
                }
            },
            {
                chainId: 42220,
                urls: {
                    apiURL: "https://api.celoscan.io/api",
                }
            },
            {
                chainId: 25,
                urls: {
                    apiURL: "https://api.cronoscan.com/api",
                }
            },
        ]
    },
};
