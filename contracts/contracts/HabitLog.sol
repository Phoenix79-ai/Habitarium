// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Import Ownable for access control
import "@openzeppelin/contracts/access/Ownable.sol";
// We don't strictly need to import the interfaces of RewardToken/RewardItem
// if the backend handles minting, but storing their addresses is useful.

/**
 * @title HabitLog
 * @dev Records habit completions, tracks streaks, and emits events for off-chain processing.
 * Ensures users adhere to cooldown periods between completions.
 * The owner (deployer/backend) configures reward contract addresses.
 */
contract HabitLog is Ownable {

    // --- State Variables ---

    // Address of the RewardToken (ERC20) contract associated with this log. Set by Owner.
    address public rewardTokenAddress;
    // Address of the RewardItem (ERC1155) contract associated with this log. Set by Owner.
    address public rewardItemAddress;

    // Struct to store details about the last completion and current streak for a specific habit
    struct HabitCompletion {
        uint256 lastCompletedTimestamp; // Timestamp of the last completion recorded
        uint256 currentStreak;          // Current consecutive completion streak
    }

    // Mapping: user address => habit ID => completion details
    // habitId is a simple number assigned off-chain (e.g., by our backend)
    // Example: completions[0xUserAddress][0] holds data for user's habit #0
    mapping(address => mapping(uint256 => HabitCompletion)) public completions;

    // Define a cooldown period (e.g., 20 hours) to prevent spamming completions
    // This allows some flexibility instead of a strict 24 hours.
    uint256 public constant DAILY_COOLDOWN = 20 hours; // Solidity time units (seconds)

    // --- Events ---

    // Emitted every time a habit completion is successfully logged
    event HabitCompleted(
        address indexed user,      // The user who completed the habit
        uint256 indexed habitId,   // The ID of the habit completed
        uint256 timestamp,         // Time of completion (block timestamp)
        uint256 newStreak          // The user's streak *after* this completion
    );

    // Emitted when a user reaches a significant streak milestone (makes backend logic easier)
    event StreakMilestone(
        address indexed user,
        uint256 indexed habitId,
        uint256 streak             // The milestone streak reached (e.g., 7, 30)
    );


    // --- Constructor ---
    /**
     * @dev Sets the deployer as the initial owner.
     */
    constructor() Ownable(msg.sender) {} // Set deployer as owner


    // --- Configuration Functions (Owner Only) ---

    /**
     * @dev Sets the address of the RewardToken contract. Only callable by the owner.
     * @param _tokenAddress The deployed address of the RewardToken contract.
     */
    function setRewardTokenAddress(address _tokenAddress) public onlyOwner {
        require(_tokenAddress != address(0), "HabitLog: Invalid token address");
        rewardTokenAddress = _tokenAddress;
    }

    /**
     * @dev Sets the address of the RewardItem NFT contract. Only callable by the owner.
     * @param _itemAddress The deployed address of the RewardItem contract.
     */
    function setRewardItemAddress(address _itemAddress) public onlyOwner {
        require(_itemAddress != address(0), "HabitLog: Invalid item address");
        rewardItemAddress = _itemAddress;
    }


    // --- Core Logic ---

    /**
     * @dev Logs a completion for a given habit ID for the calling user (msg.sender).
     * Performs cooldown checks, calculates the new streak, updates storage, and emits events.
     * @param _habitId The identifier for the habit being logged (managed off-chain).
     */
    function logHabitCompletion(uint256 _habitId) public {
        // Get the address of the user calling this function
        address user = msg.sender;
        // Get a reference (storage pointer) to the user's completion data for this habit ID
        // Using 'storage' means changes we make to 'completionRecord' directly modify the blockchain state
        HabitCompletion storage completionRecord = completions[user][_habitId];
        // Get the current time from the blockchain block header
        uint256 currentTime = block.timestamp;

        // 1. Cooldown Check: Ensure enough time has passed since the last completion.
        require(
            currentTime >= completionRecord.lastCompletedTimestamp + DAILY_COOLDOWN,
            "HabitLog: Cooldown active, cannot log yet" // Error message if check fails
        );

        // 2. Streak Calculation: Determine the new streak length.
        uint256 newStreak;
        // Check if the last completion was recent enough to continue the streak.
        // We allow roughly 2 cooldown periods (e.g., 40 hours) to maintain a daily streak,
        // giving flexibility if a user misses a day slightly. Adjust as needed.
        if (completionRecord.lastCompletedTimestamp > 0 && // Make sure they completed at least once before
            currentTime < completionRecord.lastCompletedTimestamp + (DAILY_COOLDOWN * 2))
        {
            // Streak continues
            newStreak = completionRecord.currentStreak + 1;
        } else {
            // Streak broken or this is the first completion
            newStreak = 1;
        }

        // 3. Update State: Store the new completion time and streak length on the blockchain.
        completionRecord.lastCompletedTimestamp = currentTime;
        completionRecord.currentStreak = newStreak;

        // 4. Emit HabitCompleted Event: Announce the completion for backend listeners.
        emit HabitCompleted(user, _habitId, currentTime, newStreak);

        // 5. Check for and Emit Streak Milestones (Optional but helpful for backend):
        // Example milestones: 7-day, 30-day, 100-day streaks
        if (newStreak == 7 || newStreak == 30 || newStreak == 100) {
            emit StreakMilestone(user, _habitId, newStreak);
        }

        // 6. Trigger Rewards: In our design, the backend listens for the events above
        // and calls mint() on the RewardToken/RewardItem contracts. We don't mint directly here.
    }


    // --- View Functions (Read-only data access) ---

    /**
     * @dev Returns the timestamp of the last recorded completion for a user and habit.
     */
    function getLastCompletionTime(address user, uint256 habitId) public view returns (uint256) {
        return completions[user][habitId].lastCompletedTimestamp;
    }

    /**
     * @dev Returns the current streak for a user and habit.
     */
    function getCurrentStreak(address user, uint256 habitId) public view returns (uint256) {
        return completions[user][habitId].currentStreak;
    }


}