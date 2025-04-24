// Import necessary Hardhat types and plugins
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox"; // Includes ethers, waffle, etc.
import 'dotenv/config'; // Allows us to use .env file variables

// --- IMPORTANT: Get Monad Testnet Details ---
// TODO: Replace placeholders below with the ACTUAL Monad Testnet details you found!
// Find these from Monad's official documentation or Discord/community channels.
const DEFAULT_MONAD_RPC_URL = "https://testnet.monad.xyz/"; // EXAMPLE - REPLACE THIS
const DEFAULT_MONAD_CHAIN_ID = "10255"; // EXAMPLE - REPLACE THIS
const DEFAULT_MONAD_EXPLORER_API_URL = "https://explorer.testnet.monad.xyz/api"; // EXAMPLE - REPLACE THIS
const DEFAULT_MONAD_EXPLORER_BROWSER_URL = "https://explorer.testnet.monad.xyz"; // EXAMPLE - REPLACE THIS

// Retrieve environment variables from .env file or use defaults/placeholders
const MONAD_TESTNET_RPC_URL = process.env.MONAD_TESTNET_RPC_URL || DEFAULT_MONAD_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY || ""; // MUST be set in .env
// Ensure MONAD_CHAIN_ID is parsed as a number
const MONAD_CHAIN_ID = parseInt(process.env.MONAD_CHAIN_ID || DEFAULT_MONAD_CHAIN_ID, 10);
const MONAD_EXPLORER_API_KEY = process.env.MONAD_EXPLORER_API_KEY || ""; // Optional API key for verification

// --- Input Validation (Helps catch setup errors) ---
if (!process.env.MONAD_TESTNET_RPC_URL) {
  console.warn(`WARN: MONAD_TESTNET_RPC_URL not found in .env, using default placeholder: ${DEFAULT_MONAD_RPC_URL}. Please update!`);
}
if (!PRIVATE_KEY) {
  // This is critical for deployment!
  console.error("ERROR: PRIVATE_KEY is not set in the .env file. Deployment and contract interactions requiring a signer will fail.");
} else if (!PRIVATE_KEY.startsWith('0x') || PRIVATE_KEY.length !== 66) {
   console.warn("WARN: PRIVATE_KEY in .env file doesn't look like a standard Ethereum private key (should start with 0x and be 66 hex characters long).");
}
if (!process.env.MONAD_CHAIN_ID) {
   console.warn(`WARN: MONAD_CHAIN_ID not found in .env, using default placeholder: ${DEFAULT_MONAD_CHAIN_ID}. Please update!`);
}
if (isNaN(MONAD_CHAIN_ID)) {
   console.error(`ERROR: MONAD_CHAIN_ID is not a valid number. Check your .env file. Value was: ${process.env.MONAD_CHAIN_ID}`);
}

// Hardhat configuration object
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20", // <<<--- UPDATED
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
 },
  networks: {
    // Configuration for the Monad Testnet
    monadTestnet: {
      url: MONAD_TESTNET_RPC_URL,
      chainId: MONAD_CHAIN_ID,
      // Use the private key from .env for deploying and sending transactions from this machine
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    // Configuration for the local Hardhat development network (for quick tests)
    hardhat: {
      chainId: 1337, // Standard default for local testing
    },
  },
  // Configuration for Etherscan-like explorers (useful for verifying contract source code)
  etherscan: {
     // This apiKey section might need adjustment depending on Monad's specific explorer setup
     apiKey: {
         // The key 'monadTestnet' MUST match the network name defined in the 'networks' section above
         monadTestnet: MONAD_EXPLORER_API_KEY, // Use the API key from .env if provided
     },
     customChains: [
        {
          network: "monadTestnet", // Must match network name above
          chainId: MONAD_CHAIN_ID,
          urls: {
            // You MUST find these URLs from Monad's official documentation if you want verification to work
            apiURL: process.env.MONAD_EXPLORER_API_URL || DEFAULT_MONAD_EXPLORER_API_URL, // API endpoint for verification
            browserURL: process.env.MONAD_EXPLORER_BROWSER_URL || DEFAULT_MONAD_EXPLORER_BROWSER_URL // Base URL of the explorer website
          }
        }
     ]
  },
  // Optional: Gas reporter plugin configuration
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true", // Enable by setting REPORT_GAS=true in .env
    currency: "USD", // Show equivalent costs in USD (requires coinmarketcap API key)
    coinmarketcap: process.env.COINMARKETCAP_API_KEY, // Optional: For accurate USD pricing
  },
  // Optional: TypeChain generates TypeScript types for your contracts, making frontend/backend integration easier
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6", // Use ethers-v5 types
  },
};

export default config;