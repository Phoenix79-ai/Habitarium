// backend/src/controllers/reward.controller.ts
import { Response } from 'express';
import pool from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AVAILABLE_REWARDS, findRewardById, Reward } from '../config/rewards.config'; // Import rewards config
import { PoolClient } from 'pg';

// List Available Rewards
export const listRewards = async (req: AuthenticatedRequest, res: Response) => {
    // Simply return the static list
    console.log(`[RewardCtrl] Listing available rewards`);
    return res.status(200).json({
        message: "Rewards listed successfully",
        rewards: AVAILABLE_REWARDS
    });
};

// Redeem a Reward (Updated)
export const redeemReward = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId;
    const { rewardId } = req.params; // Get reward ID from URL parameter

    console.log(`[RewardCtrl] User ${userId} attempting to redeem reward ${rewardId}`);

    if (!userId) return res.status(401).json({ message: 'User not identified' });
    if (!rewardId) return res.status(400).json({ message: 'Reward ID is required' });

    const rewardToRedeem = findRewardById(rewardId);

    if (!rewardToRedeem) {
        return res.status(404).json({ message: 'Reward not found' });
    }

    let client: PoolClient | null = null;

    try {
        client = await pool.connect();
        await client.query('BEGIN'); // Start transaction

        // 1. Get user's current HP (Lock row)
        const getUserSql = 'SELECT hp FROM users WHERE id = $1 FOR UPDATE';
        const userResult = await client.query(getUserSql, [userId]);

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'User not found' });
        }
        const currentUser = userResult.rows[0];

        // 2. Check if user has enough HP
        if (currentUser.hp < rewardToRedeem.costHp) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Not enough HP to redeem this reward' });
        }

        // 3. Check if reward already unlocked
        const checkOwnedSql = 'SELECT reward_id FROM user_unlocked_rewards WHERE user_id = $1 AND reward_id = $2';
        const checkOwnedResult = await client.query(checkOwnedSql, [userId, rewardId]);
        if (checkOwnedResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'You have already unlocked this reward.' });
        }

        // 4. Deduct HP and Optionally Set Active Title
        const newHp = currentUser.hp - rewardToRedeem.costHp;
        const newTitle = rewardToRedeem.name; // Set the newly redeemed title as active
        // Note: You might want more complex logic later to *choose* an active title
        const updateUserSql = 'UPDATE users SET hp = $1, active_title = $2 WHERE id = $3 RETURNING hp, active_title';
        const updateResult = await client.query(updateUserSql, [newHp, newTitle, userId]);
        if (updateResult.rows.length === 0) {
            throw new Error('Failed to update user HP/title after validation');
        }

        // 5. Insert into user_unlocked_rewards
        const insertUnlockSql = 'INSERT INTO user_unlocked_rewards (user_id, reward_id) VALUES ($1, $2)';
        await client.query(insertUnlockSql, [userId, rewardId]);

        await client.query('COMMIT'); // Commit transaction

        console.log(`[RewardCtrl] User ${userId} successfully redeemed and unlocked ${rewardToRedeem.name}. New HP: ${newHp}`);

        return res.status(200).json({
            message: `Reward '${rewardToRedeem.name}' redeemed successfully!`,
            user: { // Return updated user info
                hp: updateResult.rows[0].hp,
                active_title: updateResult.rows[0].active_title
            }
        });

    } catch (error: any) {
        if (client) await client.query('ROLLBACK');
        // Handle potential unique violation on user_unlocked_rewards if race condition somehow bypassed check
        if (error.code === '23505' && error.constraint === 'user_unlocked_rewards_pkey') {
            return res.status(409).json({ message: 'Reward already unlocked (concurrent request?).' });
        }
        console.error(`[RewardCtrl] Error redeeming reward ${rewardId} for user ${userId}:`, error);
        return res.status(500).json({ message: 'Server error redeeming reward' });
    } finally {
        client?.release();
    }
};

// Get OWNED Rewards Function (New)
export const getOwnedRewards = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId;
    console.log(`[RewardCtrl] Attempting to get owned rewards for user: ${userId}`);
    if (!userId) { return res.status(401).json({ message: 'User not identified' }); }

    let client: PoolClient | null = null;
    try {
        client = await pool.connect();
        // Select the reward IDs the user has unlocked
        const getOwnedSql = `
            SELECT reward_id, unlocked_at
            FROM user_unlocked_rewards
            WHERE user_id = $1
            ORDER BY unlocked_at DESC
        `;
        const result = await client.query(getOwnedSql, [userId]);

        // Map the IDs back to the full reward details from our static config
        const ownedRewardDetails = result.rows
            .map(row => findRewardById(row.reward_id)) // Find full details
            .filter((reward): reward is Reward => reward !== undefined); // Type guard to filter out undefined

        console.log(`[RewardCtrl] Found ${ownedRewardDetails.length} owned rewards for user ${userId}`);

        return res.status(200).json({
            message: "Owned rewards retrieved successfully",
            ownedRewards: ownedRewardDetails // Send the array of detailed rewards
        });

    } catch (error) {
        console.error('[RewardCtrl] Error getting owned rewards:', error);
        return res.status(500).json({ message: 'Server error retrieving owned rewards' });
    } finally {
        client?.release();
    }
};