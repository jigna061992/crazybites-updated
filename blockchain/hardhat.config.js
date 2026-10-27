require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "paris",
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC || "",
      chainId: 97,
      accounts: [process.env.DEPLOYER_KEY, process.env.JIGNA_KEY, process.env.HEENA_KEY].filter(Boolean),
    },
  },
};