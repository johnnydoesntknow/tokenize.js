require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,  // Increased optimizer runs for better gas optimization
      },
      viaIR: true,  // Enable IR-based code generator to avoid stack too deep errors
    },
  },
  networks: {
    sage: {
      url: process.env.SAGE_RPC_URL || "https://rpc.sage.soniclabs.com",
      chainId: 403,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  etherscan: {
    apiKey: {
      sage: "your-etherscan-api-key", // Not required for SAGE testnet
    },
    customChains: [
      {
        network: "sage",
        chainId: 403,
        urls: {
          apiURL: "https://api.sage.soniclabs.com/api",
          browserURL: "https://sage.soniclabs.com"
        }
      }
    ]
  }
};