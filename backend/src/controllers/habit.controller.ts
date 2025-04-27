// backend/src/controllers/habit.controller.ts (Complete with goal_id integration)

import { Response } from 'express';
import pool from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware'; // Assuming this provides req.user.userId as UUID string
import { PoolClient } from 'pg';

// --- Constants for Gamification ---
// (Keep existing constants as they are)
const BASE_XP_DAILY = 10;
const BASE_HP_DAILY = 5;
const BASE_XP_WEEKLY = 25;
const BASE_HP_WEEKLY = 15;
const BASE_XP_MONTHLY = 60;
const BASE_HP_MONTHLY = 35;
const XP_PER_STREAK_DAY = 2;
const HP_PER_STREAK_DAY = 1;
const XP_FOR_LEVEL_UP = 100;

// --- Helper Function: Calculate XP Threshold ---
const calculateXpThresholdForLevel = (level: number): number => {
    if (level <= 1) return 0;
    return (level - 1) * XP_FOR_LEVEL_UP;
};

// --- Helper Function: Validate UUID ---
const isValidUUID = (uuid: any): boolean => {
    if (typeof uuid !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

// --- Create Habit ---
export const createHabit = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId; // Expecting UUID string
    // Destructure goal_id from body
    const { name, description = null, frequency = 'daily', target = 1, goal_id = null } = req.body;

    console.log(`[HabitCtrl] Create request: User ${userId}`, { name, frequency, target, goal_id });

    // Validation
    if (!userId || !isValidUUID(userId)) { return res.status(401).json({ message: 'User not identified or invalid ID' }); }
    if (!name?.trim()) { return res.status(400).json({ message: 'Habit name is required' }); }
    // Validate goal_id format if provided (it's optional)
    if (goal_id && !isValidUUID(goal_id)) {
        return res.status(400).json({ message: 'Invalid goal ID format provided' });
    }

    let client: PoolClient | null = null;
    try {
        client = await pool.connect();
        await client.query('BEGIN'); // Start transaction

        // --- Optional: Check if the provided goal_id exists for this user ---
        // if (goal_id) {
        //     const goalCheck = await client.query('SELECT 1 FROM goals WHERE goal_id = $1 AND user_id = $2', [goal_id, userId]);
        //     if (goalCheck.rowCount === 0) {
        //         await client.query('ROLLBACK');
        //         return res.status(400).json({ message: 'Specified goal not found for this user' });
        //     }
        // }
        // --- End Optional Check ---

        // Include goal_id in INSERT statement
        const insertHabitSql = `
            INSERT INTO habits (user_id, name, description, frequency, target, goal_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id AS habit_id, user_id, name, description, frequency, target, goal_id, created_at, updated_at        `;
        // Pass goal_id (or null if not provided) as the 6th parameter
        const result = await client.query(insertHabitSql, [userId, name.trim(), description, frequency, target, goal_id]);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(500).json({ message: 'Server error creating habit.' });
        }
        const newHabit = result.rows[0];

        // Also initialize streak record within the same transaction
        await client.query(
            'INSERT INTO habit_streaks (habit_id, user_id, current_streak, longest_streak, last_logged_date) VALUES ($1, $2, 0, 0, NULL)',
            [newHabit.habit_id, userId]
        );
        // NOTE: Ensure habit_streaks table exists and has these columns

        await client.query('COMMIT'); // Commit transaction

        console.log(`[HabitCtrl] Habit created successfully for user ${userId}:`, newHabit.habit_id);
        // Return the created habit, including goal_id
        return res.status(201).json({ message: 'Habit created successfully', habit: newHabit });

    } catch (error) {
        if (client) await client.query('ROLLBACK'); // Rollback on any error
        console.error('[HabitCtrl] Error creating habit:', error);
        return res.status(500).json({ message: 'Server error creating habit' });
    } finally {
        client?.release();
    }
};

// --- Get User Habits ---
export const getUserHabits = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId; // Expecting UUID string
    console.log(`[HabitCtrl] Get habits request: User ${userId}`);

    if (!userId || !isValidUUID(userId)) { return res.status(401).json({ message: 'User not identified or invalid ID' }); }

    let client: PoolClient | null = null;
    try {
        client = await pool.connect();
        // Ensure goal_id is selected
        const getHabitsSql = `
           SELECT
               h.id AS habit_id, h.name, h.description, h.frequency, h.target,
               h.goal_id, -- <-- Select goal_id here
               h.created_at, h.updated_at,
               COALESCE(s.current_streak, 0) AS current_streak, -- Use COALESCE for default values
               COALESCE(s.longest_streak, 0) AS longest_streak,
               s.last_logged_date,
               EXISTS (
                   SELECT 1 FROM habit_logs hl
                   WHERE hl.habit_id = h.id AND hl.log_date = CURRENT_DATE
               ) AS is_logged_today -- Simpler check for today's log
           FROM habits h
           LEFT JOIN habit_streaks s ON h.id = s.habit_id -- Assuming habit_id is unique key in streaks
           WHERE h.user_id = $1
           ORDER BY h.created_at DESC
       `;
        const result = await client.query(getHabitsSql, [userId]);
        const habits = result.rows; // Frontend will expect goal_id to be present here (can be null)

        console.log(`[HabitCtrl] Found ${habits.length} habits for user ${userId}.`);
        return res.status(200).json({ message: 'User habits retrieved successfully', habits: habits });
    } catch (error) {
        console.error('[HabitCtrl] Error getting user habits:', error);
        return res.status(500).json({ message: 'Server error retrieving habits' });
    } finally {
        client?.release();
    }
};

// --- Log Habit Completion ---
// (This function does not directly interact with goal_id, so it remains largely unchanged)
// (Ensure the Habit type returned by the query includes goal_id if needed elsewhere)
// --- Log Habit Completion (Revised Locking Strategy) ---
export const logHabitCompletion = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId; // Expecting UUID string
    const { habitId } = req.params; // Expecting UUID string
    const logDateInput = req.body.logDate; // Optional specific date
    const today = new Date();
    const todayDateString = today.toISOString().split('T')[0];
    let logDate = todayDateString; // Default to today

    // Validate IDs
    if (!userId || !isValidUUID(userId)) { return res.status(401).json({ message: 'User not identified or invalid ID' }); }
    if (!habitId || !isValidUUID(habitId)) { return res.status(400).json({ message: 'Valid Habit ID required' }); }

    // Validate and parse optional logDateInput
    // ... (keep existing logDateInput validation) ...
    if (logDateInput) {
      try { /* ... keep existing ... */ } catch (e) { /* ... */ }
    }


    console.log(`[HabitCtrl] Log request: User ${userId}, Habit ${habitId}, Date ${logDate}`);

    let client: PoolClient | null = null;
    try {
        client = await pool.connect();
        await client.query('BEGIN'); // Start transaction

        // --- Step 1 & 2: Get and Lock Habit & Streak Info ---
        // 1a. Get and Lock the main habit row
        const getHabitSql = 'SELECT id, frequency, user_id FROM habits WHERE id = $1 AND user_id = $2 FOR UPDATE';
        const habitResult = await client.query(getHabitSql, [habitId, userId]);
        if (habitResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Habit not found or does not belong to user' });
        }
        const habitInfo = habitResult.rows[0]; // Contains id, frequency, user_id

        // 1b. Get and Lock the streak row (or insert if missing)
        let currentStreak = 0;
        let longestStreak = 0;
        let lastLoggedDate: Date | null = null;

        const getStreakSql = `SELECT current_streak, longest_streak, last_logged_date FROM habit_streaks WHERE habit_id = $1 AND user_id = $2 FOR UPDATE`;
        const streakResult = await client.query(getStreakSql, [habitId, userId]);

        if (streakResult.rows.length > 0) {
            const streakData = streakResult.rows[0];
            currentStreak = streakData.current_streak;
            longestStreak = streakData.longest_streak;
            lastLoggedDate = streakData.last_logged_date ? new Date(streakData.last_logged_date) : null;
            console.log(`[HabitCtrl] Found existing streak data for Habit ${habitId}`);
        } else {
            // Streak record doesn't exist, insert a default one
             console.warn(`[HabitCtrl] No streak record found for Habit ${habitId}, User ${userId}. Inserting default.`);
             await client.query(
                 'INSERT INTO habit_streaks (habit_id, user_id, current_streak, longest_streak, last_logged_date) VALUES ($1, $2, 0, 0, NULL)',
                 [habitId, userId]
             );
             // Values remain 0 / null for calculations below
        }
        // --- End Step 1 & 2 ---

        // --- Step 3: Check duplicate log ---
        const checkLogSql = 'SELECT id FROM habit_logs WHERE user_id = $1 AND habit_id = $2 AND log_date = $3';
        const logCheckResult = await client.query(checkLogSql, [userId, habitId, logDate]);
        if (logCheckResult.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: `Habit already logged for ${logDate}` });
        }
        // --- End Step 3 ---

        // --- Step 4: Insert log ---
        const insertLogSql = `INSERT INTO habit_logs (user_id, habit_id, log_date) VALUES ($1, $2, $3) RETURNING id, log_date`;
        const insertResult = await client.query(insertLogSql, [userId, habitId, logDate]);
        const newLog = insertResult.rows[0];
        // --- End Step 4 ---

        // --- Step 5 & 6: Calculate Gamification & Update Streaks ---
        let calculatedNewStreak = currentStreak; // Start with existing streak

        if (logDate === todayDateString) { // Only update current streak if logging for today
            let yesterday = new Date(today);
            yesterday.setUTCDate(today.getUTCDate() - 1);
            const yesterdayString = yesterday.toISOString().split('T')[0];

            if (lastLoggedDate && lastLoggedDate.toISOString().split('T')[0] === yesterdayString) {
                calculatedNewStreak++; // Increment if logged yesterday
            } else if (!lastLoggedDate || lastLoggedDate.toISOString().split('T')[0] !== todayDateString) {
                calculatedNewStreak = 1; // Reset if not logged yesterday or today
            }
            // If already logged today, caught by duplicate check

            // Update streak table only if logging for today
             const updateStreakSql = `
                UPDATE habit_streaks
                SET current_streak = $1, longest_streak = GREATEST(longest_streak, $1), last_logged_date = $2
                WHERE habit_id = $3 AND user_id = $4`;
             await client.query(updateStreakSql, [calculatedNewStreak, logDate, habitId, userId]);

        } else {
            // Logging for a past date - don't change current_streak or last_logged_date
            // We *could* try to recalculate longest_streak based on past logs, but it's complex.
            // For simplicity, we only update longest_streak based on today's potential current streak increase.
            const updateLongestOnlySql = `
               UPDATE habit_streaks
               SET longest_streak = GREATEST(longest_streak, $1)
               WHERE habit_id = $2 AND user_id = $3 AND longest_streak < $1`;
            await client.query(updateLongestOnlySql, [calculatedNewStreak, habitId, userId]);
        }


        // Fetch final longest streak after potential update
        const getUpdatedStreakSql = 'SELECT longest_streak FROM habit_streaks WHERE habit_id = $1 AND user_id = $2';
        const updatedStreakResult = await client.query(getUpdatedStreakSql, [habitId, userId]);
        // Use calculatedNewStreak for current streak, fetch finalLongestStreak
        const finalLongestStreak = updatedStreakResult.rows[0]?.longest_streak ?? longestStreak;


        // Calculate Base XP/HP
        let baseXP: number; let baseHP: number;
        switch (habitInfo.frequency?.toLowerCase()) { // Use frequency from locked habitInfo
            case 'weekly': baseXP = BASE_XP_WEEKLY; baseHP = BASE_HP_WEEKLY; break;
            case 'monthly': baseXP = BASE_XP_MONTHLY; baseHP = BASE_HP_MONTHLY; break;
            default: baseXP = BASE_XP_DAILY; baseHP = BASE_HP_DAILY; break;
        }

        // Calculate Streak Bonus
        const streakBonusXP = (Math.max(0, calculatedNewStreak - 1) * XP_PER_STREAK_DAY);
        const streakBonusHP = (Math.max(0, calculatedNewStreak - 1) * HP_PER_STREAK_DAY);
        let xpEarned = baseXP + streakBonusXP;
        let hpEarned = baseHP + streakBonusHP;
        // --- End Step 5 & 6 ---

        // --- Step 7 & 8: Update User Table ---
        const getUserSql = 'SELECT xp, level, hp FROM users WHERE id = $1 FOR UPDATE'; // Lock user row
        const userResult = await client.query(getUserSql, [userId]);
        // No need to check rowCount, should exist if middleware passed
        const currentUser = userResult.rows[0];
        const newXp = currentUser.xp + xpEarned;
        let newHp = currentUser.hp + hpEarned;
        let newLevel = currentUser.level;
        let levelUpOccurred = false;

        // Level Up Check
        let xpNeededForNextLevel = calculateXpThresholdForLevel(newLevel + 1);
        while (newXp >= xpNeededForNextLevel && xpNeededForNextLevel >= 0) {
            newLevel++;
            levelUpOccurred = true;
            newHp += 50; // Level up HP bonus
            console.log(`[HabitCtrl] User ${userId} Leveled Up to ${newLevel}!`);
            xpNeededForNextLevel = calculateXpThresholdForLevel(newLevel + 1);
        }

        const updateUserSql = `UPDATE users SET xp = $1, level = $2, hp = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`;
        await client.query(updateUserSql, [newXp, newLevel, newHp, userId]);
        // --- End Step 7 & 8 ---


        await client.query('COMMIT'); // Commit transaction
        console.log(`[HabitCtrl] Log & gamification update complete for User ${userId}, Habit ${habitId}`);

        // --- Blockchain Simulation Placeholder ---
        const fakeTxHash = `0x${[...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        console.log(`[HabitCtrl] Simulated blockchain interaction for log ${newLog.id}. TxHash: ${fakeTxHash}`);
        // --- End Placeholder ---

        return res.status(201).json({
            message: 'Habit logged successfully',
            log: newLog,
            // Return calculated/fetched streak info for the specific habit logged
            habit: {
                habit_id: habitId,
                current_streak: calculatedNewStreak, // Use the calculated value
                longest_streak: finalLongestStreak // Use the potentially updated value
            },
            gamification: {
                xpEarned,
                hpEarned,
                levelUp: levelUpOccurred,
                newLevel: levelUpOccurred ? newLevel : null,
                // Return final user stats after this log
                currentUserLevel: newLevel,
                currentUserXp: newXp,
                currentUserHp: newHp,
            },
            simulatedTxHash: fakeTxHash
        });
    } catch (error: any) {
        if (client) await client.query('ROLLBACK'); // Rollback on error
        console.error('[HabitCtrl] Error during habit logging transaction:', error);
        return res.status(500).json({ message: 'Server error logging habit' });
    } finally {
        client?.release();
    }
};


// --- Update Habit ---
export const updateHabit = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId; // Expecting UUID string
    const { id: habitId } = req.params; // Renamed for clarity, expecting UUID string
    // Destructure goal_id from body
    const { name, description, frequency, target, goal_id } = req.body;

    console.log(`[HabitCtrl] Update request: User ${userId}, Habit ${habitId}`, req.body);

    // Validate IDs
    if (!userId || !isValidUUID(userId)) { return res.status(401).json({ message: 'User not identified or invalid ID' }); }
    if (!habitId || !isValidUUID(habitId)) { return res.status(400).json({ message: 'Valid Habit ID required' }); }

    // Validate goal_id format if provided (allow null)
    if (goal_id !== undefined && goal_id !== null && !isValidUUID(goal_id)) {
        return res.status(400).json({ message: 'Invalid goal ID format provided' });
    }

    // --- Dynamic Query Building ---
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) { fieldsToUpdate.push(`name = $${paramIndex++}`); values.push(name.trim()); }
    if (description !== undefined) { fieldsToUpdate.push(`description = $${paramIndex++}`); values.push(description); } // Allow empty string for description? Or null? Assuming allow null via DB.
    if (frequency !== undefined) { fieldsToUpdate.push(`frequency = $${paramIndex++}`); values.push(frequency); }
    if (target !== undefined) { fieldsToUpdate.push(`target = $${paramIndex++}`); values.push(target); } // Add validation for target type/value if needed
    // Add goal_id update only if it was provided in the request body
    if (goal_id !== undefined) {
        fieldsToUpdate.push(`goal_id = $${paramIndex++}`);
        values.push(goal_id); // Handles null correctly to unset goal
    }
    fieldsToUpdate.push(`updated_at = CURRENT_TIMESTAMP`);

    // Check if any fields other than updated_at were provided
    if (fieldsToUpdate.length <= 1) {
        return res.status(400).json({ message: 'No valid fields provided for update' });
    }
    // --- End Dynamic Query Building ---


    let client: PoolClient | null = null;
    try {
        client = await pool.connect();
        await client.query('BEGIN'); // Start transaction

        // Verify habit ownership first
        const verifyHabitSql = 'SELECT id FROM habits WHERE id = $1 AND user_id = $2 FOR UPDATE'; // Lock row
        const verifyResult = await client.query(verifyHabitSql, [habitId, userId]);
        if (verifyResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Habit not found or does not belong to user' });
        }

        // --- Optional: Check if the provided goal_id exists for this user ---
        // if (goal_id) { // Only check if goal_id is not null
        //    const goalCheck = await client.query('SELECT 1 FROM goals WHERE goal_id = $1 AND user_id = $2', [goal_id, userId]);
        //    if (goalCheck.rowCount === 0) {
        //        await client.query('ROLLBACK');
        //        return res.status(400).json({ message: 'Specified goal not found for this user' });
        //    }
        // }
        // --- End Optional Check ---


        // Add WHERE clause parameters to the values array AFTER the SET parameters
        values.push(habitId); const habitIdParamIndex = paramIndex++;
        values.push(userId); const userIdParamIndex = paramIndex;

        // Construct the final UPDATE query
        const updateHabitSql = `
            UPDATE habits SET ${fieldsToUpdate.join(', ')}
            WHERE id = $${habitIdParamIndex} AND user_id = $${userIdParamIndex}
            RETURNING id AS habit_id, user_id, name, description, frequency, target, goal_id, created_at, updated_at
            -- Select streaks etc from habits table directly, assuming they might be updated by triggers or other processes
            -- Or join with habit_streaks if needed for the most up-to-date streak info in response
        `;

        const result = await client.query(updateHabitSql, values);

        if (result.rows.length === 0) {
             // Should not happen due to prior check, but good safeguard
             await client.query('ROLLBACK');
             return res.status(500).json({ message: 'Failed to update habit after verification.' });
        }

        await client.query('COMMIT'); // Commit transaction

        const updatedHabit = result.rows[0];
        console.log(`[HabitCtrl] Habit ${habitId} updated successfully for user ${userId}`);
        // Return the updated habit object, including goal_id
        return res.status(200).json({ message: 'Habit updated successfully', habit: updatedHabit });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('[HabitCtrl] Error updating habit:', error);
        return res.status(500).json({ message: 'Server error updating habit' });
    } finally {
        client?.release();
    }
};

// --- Delete Habit ---
// (This function does not need changes for goal_id, as deleting a habit
//  doesn't affect the goals table directly. The FK constraint handles linking.)
export const deleteHabit = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId; // Expecting UUID string
    const { id: habitId } = req.params; // Renamed for clarity, expecting UUID string

    console.log(`[HabitCtrl] Delete request: User ${userId}, Habit ${habitId}`);

    if (!userId || !isValidUUID(userId)) { return res.status(401).json({ message: 'User not identified or invalid ID' }); }
    if (!habitId || !isValidUUID(habitId)) { return res.status(400).json({ message: 'Valid Habit ID required' }); }

    let client: PoolClient | null = null;
    try {
        client = await pool.connect();
        // Use transaction for safety, although simple delete might not strictly need it
        await client.query('BEGIN');

        // Delete associated logs first (due to FK constraints) - Adjust table/column names if different
        // This assumes habit_logs references habits.id
        await client.query('DELETE FROM habit_logs WHERE habit_id = $1 AND user_id = $2', [habitId, userId]);

        // Delete associated streaks (if they exist)
        // This assumes habit_streaks references habits.id
         await client.query('DELETE FROM habit_streaks WHERE habit_id = $1 AND user_id = $2', [habitId, userId]);


        // Then delete the habit itself
        const deleteHabitSql = `DELETE FROM habits WHERE id = $1 AND user_id = $2 RETURNING id`;
        const result = await client.query(deleteHabitSql, [habitId, userId]);

        if (result.rowCount === 0) {
             // Habit not found or user not authorized (already checked by logs/streaks delete implicitly, but good check)
             await client.query('ROLLBACK');
             return res.status(404).json({ message: 'Habit not found or user not authorized' });
        }

        await client.query('COMMIT'); // Commit transaction

        console.log(`[HabitCtrl] Habit ${habitId} deleted successfully for user ${userId}.`);
        return res.status(200).json({ message: 'Habit deleted successfully', deletedHabitId: result.rows[0].id });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('[HabitCtrl] Error deleting habit:', error);
        // Consider specific FK violation errors if delete order is wrong
        return res.status(500).json({ message: 'Server error deleting habit' });
    } finally {
        client?.release();
    }
};