// Import necessary tools from Hardhat and ethers
// 'ethers' comes from hardhat-toolbox
import { ethers } from "hardhat";
import { Signer } from "ethers"; // Import Signer type if needed, often inferred

// --- Configuration for Initial NFT Items ---
// TODO: Replace these with actual URLs pointing to your NFT metadata JSON files
// For the hackathon, you can use placeholders or simple hosting like GitHub Gist/Pages or a temporary service.
const ITEM_URI_COMMON_STICKER = "https://your-metadata-host.com/items/common_sticker.json";
const ITEM_URI_STREAK_BADGE_7D = "https://your-metadata-host.com/items/streak_badge_7d.json";
// Add more URIs if you want to create more item types initially

async function main() {
  // Get the deployer account (the one specified by PRIVATE_KEY in .env)
  const [deployer]: Signer[] = await ethers.getSigners(); // Explicitly type if needed
  if (!deployer) {
    throw new Error("Deployer account not found. Check Hardhat configuration and .env file.");
  }
  const deployerAddress = await deployer.getAddress();
  console.log(`Deploying contracts with the account: ${deployerAddress}`);

  // Optional: Check deployer balance (useful for debugging gas issues)
  const balance = await ethers.provider.getBalance(deployerAddress);
  console.log(`Deployer account balance: ${ethers.formatEther(balance)} MONAD`);
  if (balance === 0n) { // Use BigInt literal '0n'
     console.warn("WARN: Deployer account has no balance. Deployment will likely fail.");
  }

  // --- 1. Deploy RewardToken (ERC20) ---
  console.log("\nDeploying RewardToken...");
  const RewardTokenFactory = await ethers.getContractFactory("RewardToken");
  // Send the deployment transaction
  const rewardToken = await RewardTokenFactory.connect(deployer).deploy();
  // Wait for the transaction to be mined and the contract deployed
  await rewardToken.waitForDeployment();
  const rewardTokenAddress = await rewardToken.getAddress();
  console.log(`RewardToken deployed to: ${rewardTokenAddress}`);


  // --- 2. Deploy RewardItem (ERC1155) ---
  console.log("\nDeploying RewardItem...");
  const RewardItemFactory = await ethers.getContractFactory("RewardItem");
  const rewardItem = await RewardItemFactory.connect(deployer).deploy();
  await rewardItem.waitForDeployment();
  const rewardItemAddress = await rewardItem.getAddress();
  console.log(`RewardItem deployed to: ${rewardItemAddress}`);


  // --- 3. Deploy HabitLog ---
  console.log("\nDeploying HabitLog...");
  const HabitLogFactory = await ethers.getContractFactory("HabitLog");
  const habitLog = await HabitLogFactory.connect(deployer).deploy();
  await habitLog.waitForDeployment();
  const habitLogAddress = await habitLog.getAddress();
  console.log(`HabitLog deployed to: ${habitLogAddress}`);


  // --- 4. Configure HabitLog ---
  console.log("\nConfiguring HabitLog...");
  // Call setRewardTokenAddress on HabitLog, passing the deployed RewardToken address
  console.log(` - Setting RewardToken address (${rewardTokenAddress}) in HabitLog...`);
  let tx = await habitLog.connect(deployer).setRewardTokenAddress(rewardTokenAddress);
  await tx.wait(); // Wait for the configuration transaction to be mined
  console.log("   ✅ RewardToken address set.");

  // Call setRewardItemAddress on HabitLog, passing the deployed RewardItem address
  console.log(` - Setting RewardItem address (${rewardItemAddress}) in HabitLog...`);
  tx = await habitLog.connect(deployer).setRewardItemAddress(rewardItemAddress);
  await tx.wait();
  console.log("   ✅ RewardItem address set.");


  // --- 5. Create Initial NFT Item Types (Optional but Recommended) ---
  console.log("\nCreating initial NFT item types in RewardItem...");

  // Create "Common Sticker" (Item ID should be 0)
  console.log(` - Creating 'Common Sticker' with URI: ${ITEM_URI_COMMON_STICKER}`);
  tx = await rewardItem.connect(deployer).createItemType(ITEM_URI_COMMON_STICKER, "Common Habit Sticker");
  let receipt = await tx.wait();
  // Find the ItemTypeCreated event in the transaction receipt to get the ID
  const itemStickerEvent = receipt?.logs?.find((e: any) => e.fragment?.name === 'ItemTypeCreated');
  const itemStickerId = itemStickerEvent?.args?.[0]; // First argument of the event is tokenId
  console.log(`   ✅ 'Common Sticker' created with Token ID: ${itemStickerId?.toString() ?? 'N/A'}`);


  // Create "7-Day Streak Badge" (Item ID should be 1)
  console.log(` - Creating '7-Day Streak Badge' with URI: ${ITEM_URI_STREAK_BADGE_7D}`);
  tx = await rewardItem.connect(deployer).createItemType(ITEM_URI_STREAK_BADGE_7D, "7-Day Streak Achievement");
  receipt = await tx.wait();
  const itemBadgeEvent = receipt?.logs?.find((e: any) => e.fragment?.name === 'ItemTypeCreated');
  const itemBadgeId = itemBadgeEvent?.args?.[0];
  console.log(`   ✅ '7-Day Streak Badge' created with Token ID: ${itemBadgeId?.toString() ?? 'N/A'}`);

  // Add more createItemType calls here if needed...

  console.log("\n🎉 Deployment and initial configuration complete! 🎉");
  console.log("----------------------------------------------------");
  console.log("Deployed Contract Addresses:");
  console.log(`  RewardToken (HABIT): ${rewardTokenAddress}`);
  console.log(`  RewardItem (NFT):    ${rewardItemAddress}`);
  console.log(`  HabitLog:            ${habitLogAddress}`);
  console.log("----------------------------------------------------");
  console.log("Initial Item Type IDs (approx):");
  console.log(`  Common Sticker:      ${itemStickerId?.toString() ?? '0?'}`);
  console.log(`  7-Day Streak Badge:  ${itemBadgeId?.toString() ?? '1?'}`);
  console.log("----------------------------------------------------");
}

// Standard pattern to execute the main function and catch errors
main().catch((error) => {
  console.error("💥 Deployment failed:", error);
  process.exitCode = 1; // Exit with a non-zero code to indicate failure
});