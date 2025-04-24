// backend/src/controllers/habit.controller.ts (Corrected Function/Constant Order & Types)

import { Response } from 'express';
import pool from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { PoolClient } from 'pg';

// --- Constants for Gamification ---
// Base values (can be adjusted)
const BASE_XP_DAILY = 10;
const BASE_HP_DAILY = 5;
const BASE_XP_WEEKLY = 25;
const BASE_HP_WEEKLY = 15;
const BASE_XP_MONTHLY = 60;
const BASE_HP_MONTHLY = 35;

// Streak bonuses
const XP_PER_STREAK_DAY = 2;
const HP_PER_STREAK_DAY = 1;
const XP_FOR_LEVEL_UP = 100; // This constant IS USED by the helper function

// --- XP Calculation Helper Function (Defined AFTER constants) ---
const calculateXpThresholdForLevel = (level: number): number => {
    // Calculates the TOTAL XP needed to REACH this specific level
    // Example: Level 1 = 0 XP needed, Level 2 = 100 XP needed, Level 3 = 200 XP needed
    if (level <= 1) return 0;
    return (level - 1) * XP_FOR_LEVEL_UP; // Uses the constant defined above
};

// --- Create Habit ---
export const createHabit = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId;
    const { name, description = null, frequency = 'daily', target = 1 } = req.body;
    console.log(`[HabitCtrl] Create request: User ${userId}`, { name, frequency, target });
    if (!userId) { return res.status(401).json({ message: 'User not identified' }); }
    if (!name?.trim()) { return res.status(400).json({ message: 'Habit name is required' }); }
    let client: PoolClient | null = null;
    try {
        client = await pool.connect();
        const insertHabitSql = `INSERT INTO habits (user_id, name, description, frequency, target) VALUES ($1, $2, $3, $4, $5) RETURNING id AS habit_id, name, description, frequency, target, created_at, updated_at, current_streak, longest_streak, last_logged_date`;
        const result = await client.query(insertHabitSql, [userId, name.trim(), description, frequency, target]);
        if (result.rows.length === 0) { return res.status(500).json({ message: 'Server error creating habit.' }); }
        const newHabit = result.rows[0];
        console.log(`[HabitCtrl] Habit created successfully for user ${userId}:`, newHabit.habit_id);
        return res.status(201).json({ message: 'Habit created successfully', habit: newHabit });
    } catch (error) { console.error('[HabitCtrl] Error creating habit:', error); return res.status(500).json({ message: 'Server error creating habit' }); }
    finally { client?.release(); }
};

// --- Get User Habits ---
export const getUserHabits = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId;
    console.log(`[HabitCtrl] Get habits request: User ${userId}`);
    if (!userId) { return res.status(401).json({ message: 'User not identified' }); }
    let client: PoolClient | null = null;
    try {
       client = await pool.connect();
       const getHabitsSql = `
           SELECT
               h.id AS habit_id, h.name, h.description, h.frequency, h.target,
               h.created_at, h.updated_at, h.current_streak, h.longest_streak, h.last_logged_date,
               EXISTS ( SELECT 1 FROM habit_logs hl WHERE hl.habit_id = h.id AND hl.user_id = $1 AND hl.log_date = CURRENT_DATE ) AS is_logged_today
           FROM habits h WHERE h.user_id = $1 ORDER BY h.created_at DESC
       `;
       const result = await client.query(getHabitsSql, [userId]);
       const habits = result.rows;
       console.log(`[HabitCtrl] Found ${habits.length} habits for user ${userId}.`);
       return res.status(200).json({ message: 'User habits retrieved successfully', habits: habits });
    } catch (error) { console.error('[HabitCtrl] Error getting user habits:', error); return res.status(500).json({ message: 'Server error retrieving habits' }); }
    finally { client?.release(); }
};

// --- Log Habit Completion ---
export const logHabitCompletion = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId;
    const { habitId } = req.params;
    const logDateInput = req.body.logDate;
    const today = new Date(); const todayDateString = today.toISOString().split('T')[0];
    let logDate = todayDateString;
    if (logDateInput) { try { const d = new Date(logDateInput); if (!isNaN(d.getTime())) { logDate = d.toISOString().split('T')[0]; } } catch (e) {} }
    console.log(`[HabitCtrl] Log request: User ${userId}, Habit ${habitId}, Date ${logDate}`);
    if (!userId || !habitId) { return res.status(400).json({ message: 'User or Habit ID missing' }); }

    let client: PoolClient | null = null;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // 1. Get habit details
        const getHabitSql = 'SELECT id, frequency, current_streak, longest_streak, last_logged_date FROM habits WHERE id = $1 AND user_id = $2 FOR UPDATE';
        const habitResult = await client.query(getHabitSql, [habitId, userId]);
        if (habitResult.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Habit not found or does not belong to user' }); }
        const habit = habitResult.rows[0];

        // 2. Check duplicate log
        const checkLogSql = 'SELECT id FROM habit_logs WHERE user_id = $1 AND habit_id = $2 AND log_date = $3';
        const logCheckResult = await client.query(checkLogSql, [userId, habitId, logDate]);
        if (logCheckResult.rows.length > 0) { await client.query('ROLLBACK'); return res.status(409).json({ message: 'Habit already logged for this date' }); }

        // 3. Insert log
        const insertLogSql = `INSERT INTO habit_logs (user_id, habit_id, log_date) VALUES ($1, $2, $3) RETURNING id, log_date`;
        const insertResult = await client.query(insertLogSql, [userId, habitId, logDate]);
        const newLog = insertResult.rows[0];

        // 4. Calculate Gamification
        let newStreak = habit.current_streak; let lastLoggedActualDate = habit.last_logged_date;
        let yesterday = new Date(today); yesterday.setDate(today.getDate() - 1); const yesterdayString = yesterday.toISOString().split('T')[0];
        if (logDate === todayDateString) {
            if (lastLoggedActualDate && lastLoggedActualDate.toISOString().split('T')[0] === yesterdayString) { newStreak++; }
            else if (!(lastLoggedActualDate && lastLoggedActualDate.toISOString().split('T')[0] === todayDateString)) { newStreak = 1; }
        }
        let newLongestStreak = Math.max(habit.longest_streak, newStreak);
        let baseXP: number; let baseHP: number;
        switch (habit.frequency?.toLowerCase()) {
            case 'weekly': baseXP = BASE_XP_WEEKLY; baseHP = BASE_HP_WEEKLY; break;
            case 'monthly': baseXP = BASE_XP_MONTHLY; baseHP = BASE_HP_MONTHLY; break;
            default: baseXP = BASE_XP_DAILY; baseHP = BASE_HP_DAILY; break;
        }
        const streakBonusXP = (Math.max(0, newStreak - 1) * XP_PER_STREAK_DAY);
        const streakBonusHP = (Math.max(0, newStreak - 1) * HP_PER_STREAK_DAY);
        let xpEarned = baseXP + streakBonusXP;
        let hpEarned = baseHP + streakBonusHP;

        // 5. Update Habit Table
        let updateHabitQuery = '';
        let updateHabitParams: any[] = []; // <-- Explicit type added here
        if (logDate === todayDateString) { updateHabitQuery = `UPDATE habits SET current_streak = $1, longest_streak = $2, last_logged_date = $3 WHERE id = $4`; updateHabitParams = [newStreak, newLongestStreak, logDate, habitId]; }
        else if (!lastLoggedActualDate || new Date(logDate) > new Date(lastLoggedActualDate)) { updateHabitQuery = `UPDATE habits SET longest_streak = $1, last_logged_date = $2 WHERE id = $3`; updateHabitParams = [newLongestStreak, logDate, habitId]; }
        else if (newLongestStreak > habit.longest_streak) { updateHabitQuery = `UPDATE habits SET longest_streak = $1 WHERE id = $2`; updateHabitParams = [newLongestStreak, habitId]; }
        if(updateHabitQuery) { await client.query(updateHabitQuery, updateHabitParams); } // <-- Usage is fine now

        // 6. Update User Table
        const getUserSql = 'SELECT xp, level, hp FROM users WHERE id = $1 FOR UPDATE';
        const userResult = await client.query(getUserSql, [userId]);
        if (userResult.rows.length === 0) throw new Error('User not found during log');
        const currentUser = userResult.rows[0];
        const newXp = currentUser.xp + xpEarned;
        let newHp = currentUser.hp + hpEarned; // <-- Ensured 'let'
        let newLevel = currentUser.level; // <-- Ensured 'let'
        let levelUpOccurred = false;
        // --- Uses the helper function defined above ---
        const xpNeededForNextLevel = calculateXpThresholdForLevel(newLevel + 1); // <-- Corrected usage
        if (newXp >= xpNeededForNextLevel) { newLevel++; levelUpOccurred = true; newHp += 50; console.log(`[HabitCtrl] User ${userId} Leveled Up to ${newLevel}!`); }
        const updateUserSql = `UPDATE users SET xp = $1, level = $2, hp = $3 WHERE id = $4`;
        await client.query(updateUserSql, [newXp, newLevel, newHp, userId]);

        await client.query('COMMIT');
        console.log(`[HabitCtrl] Log & gamification update complete for User ${userId}, Habit ${habitId}`);

        console.log(`[HabitCtrl] Placeholder: Blockchain interaction would go here.`);

        return res.status(201).json({
            message: 'Habit logged successfully', log: newLog,
            gamification: { xpEarned, hpEarned, currentStreak: newStreak, longestStreak: newLongestStreak, levelUp: levelUpOccurred, newLevel: levelUpOccurred ? newLevel : null, totalXp: newXp, totalHp: newHp, }
        });
    } catch (error: any) {
        if (client) await client.query('ROLLBACK');
        if (error.code === '23505' && error.constraint === 'unique_user_habit_date') { return res.status(409).json({ message: 'Habit already logged for this date' }); }
        console.error('[HabitCtrl] Error during habit logging transaction:', error);
        return res.status(500).json({ message: 'Server error logging habit' });
    } finally {
        client?.release();
    }
};

// --- Update Habit ---
export const updateHabit = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id: habitId } = req.params;
    const { name, description, frequency, target } = req.body;
    console.log(`[HabitCtrl] Update request: User ${userId}, Habit ${habitId}`, req.body);
    if (!userId || !habitId) { return res.status(400).json({ message: 'User or Habit ID missing' }); }
    if (name === undefined && description === undefined && frequency === undefined && target === undefined) { return res.status(400).json({ message: 'No fields provided for update' }); }

    let client: PoolClient | null = null;
    try {
        client = await pool.connect();
        const verifyHabitSql = 'SELECT id FROM habits WHERE id = $1 AND user_id = $2';
        const verifyResult = await client.query(verifyHabitSql, [habitId, userId]);
        if (verifyResult.rows.length === 0) { return res.status(404).json({ message: 'Habit not found or does not belong to user' }); }

        const fieldsToUpdate: string[] = []; const values: any[] = []; let paramIndex = 1;
        if (name !== undefined) { fieldsToUpdate.push(`name = $${paramIndex++}`); values.push(name.trim()); }
        if (description !== undefined) { fieldsToUpdate.push(`description = $${paramIndex++}`); values.push(description); }
        if (frequency !== undefined) { fieldsToUpdate.push(`frequency = $${paramIndex++}`); values.push(frequency); }
        if (target !== undefined) { fieldsToUpdate.push(`target = $${paramIndex++}`); values.push(target); }
        fieldsToUpdate.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(habitId); const habitIdParamIndex = paramIndex++;
        values.push(userId); const userIdParamIndex = paramIndex;

        const updateHabitSql = `UPDATE habits SET ${fieldsToUpdate.join(', ')} WHERE id = $${habitIdParamIndex} AND user_id = $${userIdParamIndex} RETURNING id AS habit_id, name, description, frequency, target, created_at, updated_at, current_streak, longest_streak, last_logged_date`;

        const result = await client.query(updateHabitSql, values);
        if (result.rows.length === 0) { return res.status(500).json({ message: 'Failed to update habit.' }); }
        const updatedHabit = result.rows[0];
        console.log(`[HabitCtrl] Habit ${habitId} updated successfully for user ${userId}`);
        return res.status(200).json({ message: 'Habit updated successfully', habit: updatedHabit });
    } catch (error) { console.error('[HabitCtrl] Error updating habit:', error); return res.status(500).json({ message: 'Server error updating habit' }); }
    finally { client?.release(); }
};

// --- Delete Habit ---
export const deleteHabit = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id: habitId } = req.params;
    console.log(`[HabitCtrl] Delete request: User ${userId}, Habit ${habitId}`);
    if (!userId || !habitId) { return res.status(400).json({ message: 'User or Habit ID missing' }); }
    let client: PoolClient | null = null;
    try {
        client = await pool.connect();
        const deleteHabitSql = `DELETE FROM habits WHERE id = $1 AND user_id = $2 RETURNING id`;
        const result = await client.query(deleteHabitSql, [habitId, userId]);
        if (result.rowCount === 0) { return res.status(404).json({ message: 'Habit not found or user not authorized' }); }
        console.log(`[HabitCtrl] Habit ${habitId} deleted successfully for user ${userId}.`);
        return res.status(200).json({ message: 'Habit deleted successfully' });
    } catch (error) { console.error('[HabitCtrl] Error deleting habit:', error); return res.status(500).json({ message: 'Server error deleting habit' }); }
    finally { client?.release(); }
};