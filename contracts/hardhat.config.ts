// contracts/hardhat.config.ts (Updated with Explicit dotenv path & Debug Logs)

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox"; // Includes ethers, waffle, etc.
import dotenv from 'dotenv'; // Use import syntax
import path from 'path'; // Import path module

// Explicitly load .env from the current directory (where hardhat.config.ts is)
// This makes it less ambiguous where it's looking for the file.
const dotenvResult = dotenv.config({ path: path.resolve(__dirname, './.env') });

// Optional: Check if dotenv loading itself had an error
if (dotenvResult.error) {
    console.warn("WARN: Error loading .env file:", dotenvResult.error.message);
    console.warn("WARN: Ensure a '.env' file exists in the 'contracts' directory.");
}

// --- Monad Testnet Details (from ChainList.org / Official Sources) ---
const MONAD_RPC_URL_FROM_SOURCE = "https://testnet-rpc.monad.xyz"; // Verified working RPC
const MONAD_CHAIN_ID_FROM_SOURCE = 10143; // Verified Chain ID (use number type)
// Explorer URLs need confirmation from Monad official documentation for verification functionality
const DEFAULT_MONAD_EXPLORER_API_URL = "https://explorer.testnet.monad.xyz/api"; // Example - VERIFY THIS
const DEFAULT_MONAD_EXPLORER_BROWSER_URL = "https://explorer.testnet.monad.xyz"; // Example - VERIFY THIS

// Retrieve environment variables from .env file or use verified defaults
// Prioritize .env for RPC URL but default to the known working one
const MONAD_TESTNET_RPC_URL = process.env.MONAD_TESTNET_RPC_URL || MONAD_RPC_URL_FROM_SOURCE;
// **IMPORTANT: Use the correct variable name from your .env file**
const RAW_PRIVATE_KEY_FROM_ENV = process.env.MONAD_TESTNET_PRIVATE_KEY; // <-- Check if this matches .env variable name
const PRIVATE_KEY = RAW_PRIVATE_KEY_FROM_ENV || ""; // Default to empty string if not found

// Ensure MONAD_CHAIN_ID is parsed as a number, using the verified default
const MONAD_CHAIN_ID = parseInt(process.env.MONAD_CHAIN_ID || MONAD_CHAIN_ID_FROM_SOURCE.toString(), 10);
const MONAD_EXPLORER_API_KEY = process.env.MONAD_EXPLORER_API_KEY || ""; // Optional API key for verification


// --- Input Validation (Helps catch setup errors) ---
if (!process.env.MONAD_TESTNET_RPC_URL) {
  console.warn(`INFO: MONAD_TESTNET_RPC_URL not found in .env, using default: ${MONAD_RPC_URL_FROM_SOURCE}.`);
}
if (!PRIVATE_KEY) {
  // This is critical for deployment!
  console.error("\nERROR: MONAD_TESTNET_PRIVATE_KEY variable is empty after checking .env file. Deployment and contract interactions requiring a signer will fail.");
} else if (!PRIVATE_KEY.startsWith('0x') || PRIVATE_KEY.length !== 66) {
   // Check length (0x + 64 hex chars = 66)
   console.warn(`\nWARN: MONAD_TESTNET_PRIVATE_KEY in .env file doesn't look like a standard Ethereum private key (should start with 0x and be 66 hex characters long). Length found: ${PRIVATE_KEY.length}`);
}
// No need to warn about Chain ID if using the verified default
if (isNaN(MONAD_CHAIN_ID)) {
   console.error(`\nERROR: MONAD_CHAIN_ID could not be parsed as a valid number. Check your .env file if overriding. Value was: ${process.env.MONAD_CHAIN_ID}`);
} // (Removed redundant else if/else conditions for Chain ID)
else if (process.env.MONAD_CHAIN_ID && MONAD_CHAIN_ID !== MONAD_CHAIN_ID_FROM_SOURCE) {
    console.warn(`\nWARN: MONAD_CHAIN_ID in .env (${MONAD_CHAIN_ID}) overrides the verified default (${MONAD_CHAIN_ID_FROM_SOURCE}). Ensure this is intended.`);
}


// Hardhat configuration object
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24", // Using a recent stable version
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
      url: MONAD_TESTNET_RPC_URL, // Uses .env or the verified default
      chainId: MONAD_CHAIN_ID, // Uses .env or the verified default (10143)
      // Use the private key from .env for deploying and sending transactions
      // Ensure PRIVATE_KEY is valid before passing to accounts array
      accounts: (PRIVATE_KEY && PRIVATE_KEY.startsWith('0x') && PRIVATE_KEY.length === 66) ? [PRIVATE_KEY] : [],
    },
    // Configuration for the local Hardhat development network (for quick tests)
    hardhat: {
      chainId: 1337, // Standard default for local testing
    },
  },
  // Configuration for Etherscan-like explorers
  etherscan: {
     apiKey: {
         // The key 'monadTestnet' MUST match the network name defined in 'networks'
         monadTestnet: MONAD_EXPLORER_API_KEY, // Use the API key from .env if provided for verification
     },
     customChains: [
        {
          network: "monadTestnet", // Must match network name above
          chainId: MONAD_CHAIN_ID, // Correct Chain ID (10143)
          urls: {
            // You MUST verify these URLs from Monad's official documentation for verification to work
            apiURL: process.env.MONAD_EXPLORER_API_URL || DEFAULT_MONAD_EXPLORER_API_URL, // Verify this API endpoint
            browserURL: process.env.MONAD_EXPLORER_BROWSER_URL || DEFAULT_MONAD_EXPLORER_BROWSER_URL // Verify this explorer base URL
          }
        }
     ]
  },
  // Optional: Gas reporter plugin configuration
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  // Optional: TypeChain configuration
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6", // Keep target as needed for your project (v5 or v6)
  },
};

export default config;