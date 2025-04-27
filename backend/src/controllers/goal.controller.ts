// backend/src/controllers/goal.controller.ts (Complete with Templates & Update Feature)

import { Request, Response } from 'express';
import pool from '../config/db'; // Ensure correct path
import { AuthenticatedRequest } from '../middleware/auth.middleware'; // Custom request type
import { PoolClient } from 'pg'; // For transactions
// Import templates config and types
import { goalTemplates, GoalTemplate, HabitTemplate } from '../config/goalTemplates.config'; // Ensure correct path

// --- Interfaces ---
// Interface for Goal data from DB
interface Goal {
    goal_id: string; // UUID
    user_id: string; // UUID
    name: string;
    created_at: string;
}

// Interface for Habit data from DB (subset needed here)
interface Habit {
    habit_id: string; // UUID (renamed from 'id')
    user_id: string; // UUID
    name: string;
    description: string | null;
    frequency: string;
    goal_id: string | null; // UUID
    // Add other fields if returned/needed by RETURNING clauses
}


// --- Helper Functions ---
// Validate UUID format
const isValidUUID = (uuid: any): boolean => {
    if (typeof uuid !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};


// --- Controller Functions ---

// @desc    Get predefined goal templates
// @route   GET /api/goals/templates
// @access  Public
export const getGoalTemplates = async (req: Request, res: Response) => {
    try {
        // Return the hardcoded templates from the config file
        console.log('[GoalCtrl] Fetching predefined goal templates.');
        res.status(200).json({ templates: goalTemplates });
    } catch (error: any) {
        console.error('[GoalCtrl] Error fetching goal templates:', error);
        res.status(500).json({ message: 'Server error fetching goal templates' });
    }
};

// @desc    Add a goal and its habits from a template for a user
// @route   POST /api/goals/templates/:templateId/add
// @access  Private (Uses AuthenticatedRequest)
export const addGoalFromTemplate = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId; // Expecting UUID string
    const { templateId } = req.params;

    // Validation
    if (!userId || !isValidUUID(userId)) {
        return res.status(401).json({ message: 'Not authorized or invalid user ID' });
    }
    if (!templateId) { // templateId comes from URL param, should exist if route matched
        return res.status(400).json({ message: 'Template ID is required in URL' });
    }

    // Find the selected template from our hardcoded list
    const template = goalTemplates.find(t => t.id === templateId);
    if (!template) {
        return res.status(404).json({ message: 'Goal template not found' });
    }
     console.log(`[GoalCtrl] Adding template ${templateId} ('${template.name}') for user ${userId}`);

    let client: PoolClient | null = null;
    try {
        client = await pool.connect();
        await client.query('BEGIN'); // Start transaction

        // 1. Create the new goal for the user
        const goalResult = await client.query<Goal>( // Specify return type
            'INSERT INTO goals (user_id, name) VALUES ($1, $2) RETURNING goal_id, user_id, name, created_at',
            [userId, template.name]
        );
        if (goalResult.rows.length === 0) { throw new Error('Failed to create goal record from template'); }
        const newGoal = goalResult.rows[0];
        console.log(`[GoalCtrl] Created new goal '${newGoal.name}' (ID: ${newGoal.goal_id}) for user ${userId}`);


        // 2. Create habits based on the template, assigning them to the new goal
        const createdHabitsInfo: { id: string; name: string }[] = [];
        for (const habitTpl of template.habits) {
             const habitResult = await client.query<{ habit_id: string }>(
                'INSERT INTO habits (user_id, name, description, frequency, goal_id) VALUES ($1, $2, $3, $4, $5) RETURNING id AS habit_id',
                [userId, habitTpl.name, habitTpl.description || null, habitTpl.frequency, newGoal.goal_id]
             );
             if (habitResult.rows.length === 0) { throw new Error(`Failed to create habit record '${habitTpl.name}' from template`); }
             const newHabit = habitResult.rows[0];

             // 3. Create corresponding streak records for the new habits
             await client.query(
                'INSERT INTO habit_streaks (habit_id, user_id, current_streak, longest_streak, last_logged_date) VALUES ($1, $2, 0, 0, NULL)',
                [newHabit.habit_id, userId]
             );

             createdHabitsInfo.push({ id: newHabit.habit_id, name: habitTpl.name });
             console.log(`[GoalCtrl] Created habit '${habitTpl.name}' (ID: ${newHabit.habit_id}) for goal ${newGoal.goal_id}`);
        }

        await client.query('COMMIT'); // Commit transaction

        res.status(201).json({
             message: `Goal '${template.name}' and its habits added successfully!`,
             goal: newGoal,
             // habits: createdHabitsInfo // Optionally return created habits
         });

    } catch (error: any) {
         if (client) await client.query('ROLLBACK');
         console.error(`[GoalCtrl] Error adding goal from template ${templateId} for user ${userId}:`, error);
         res.status(500).json({ message: 'Server error adding goal from template', error: error.message });
     } finally {
         client?.release();
     }
};

// @desc    Get all CUSTOM goals for logged-in user
// @route   GET /api/goals
// @access  Private
export const getUserGoals = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId; // Expecting UUID string

    if (!userId || !isValidUUID(userId)) {
        return res.status(401).json({ message: 'Not authorized or invalid user ID' });
    }
    console.log(`[GoalCtrl] Getting custom goals for user ${userId}`);

    try {
        const result = await pool.query<Omit<Goal, 'user_id'>>(
            'SELECT goal_id, name, created_at FROM goals WHERE user_id = $1 ORDER BY created_at ASC',
            [userId]
        );
        console.log(`[GoalCtrl] Found ${result.rowCount} custom goals for user ${userId}`);
        res.status(200).json({ goals: result.rows });
    } catch (error: any) {
        console.error('[GoalCtrl] Error fetching custom goals:', error);
        res.status(500).json({ message: 'Server error fetching goals', error: error.message });
    }
};

// @desc    Create a new CUSTOM goal
// @route   POST /api/goals
// @access  Private
export const createGoal = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId; // Expecting UUID string
    const { name } = req.body;

    // Validation
    if (!userId || !isValidUUID(userId)) { return res.status(401).json({ message: 'Not authorized or invalid user ID' }); }
    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 255) { return res.status(400).json({ message: 'Valid goal name is required (1-255 chars)' }); }
    console.log(`[GoalCtrl] Creating custom goal '${name}' for user ${userId}`);

    try {
        const result = await pool.query<Goal>(
            'INSERT INTO goals (user_id, name) VALUES ($1, $2) RETURNING *',
            [userId, name.trim()]
        );
        console.log(`[GoalCtrl] Custom goal created successfully: ${result.rows[0]?.goal_id}`);
        res.status(201).json({ message: 'Goal created successfully', goal: result.rows[0] });
    } catch (error: any) {
        console.error('[GoalCtrl] Error creating custom goal:', error);
        if ((error as any).code === '23505') { return res.status(409).json({ message: `Goal with name "${name.trim()}" already exists.`}); }
        res.status(500).json({ message: 'Server error creating goal', error: error.message });
    }
};

// @desc    Update a CUSTOM goal name
// @route   PUT /api/goals/:goalId
// @access  Private
export const updateGoal = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId; // Expecting UUID string
    const { goalId } = req.params; // Expecting UUID string
    const { name } = req.body; // New name from request body

    // Validation
    if (!userId || !isValidUUID(userId)) { return res.status(401).json({ message: 'Not authorized or invalid user ID' }); }
    if (!goalId || !isValidUUID(goalId)) { return res.status(400).json({ message: 'Valid Goal ID is required in URL' }); }
    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 255) { return res.status(400).json({ message: 'Valid goal name is required (1-255 chars)' }); }
    console.log(`[GoalCtrl] Updating goal ${goalId} for user ${userId} to name '${name}'`);

    try {
        // Update the goal name if it belongs to the user
        const updateResult = await pool.query<Goal>( // Expect Goal type back
             // Only update name, keep other fields as they are
            'UPDATE goals SET name = $1 WHERE goal_id = $2 AND user_id = $3 RETURNING *', // Return all fields
            [name.trim(), goalId, userId]
        );

        if (updateResult.rowCount === 0) {
            console.log(`[GoalCtrl] Goal ${goalId} not found or not owned by user ${userId} for update`);
            return res.status(404).json({ message: 'Goal not found or not authorized to update' });
        }

        console.log(`[GoalCtrl] Updated goal ${goalId} successfully`);
        res.status(200).json({ message: 'Goal updated successfully', goal: updateResult.rows[0] });

    } catch (error: any) {
         console.error('[GoalCtrl] Error updating goal:', error);
         // Handle potential unique name constraint error if added later
         if ((error as any).code === '23505') {
             return res.status(409).json({ message: `Another goal with name "${name.trim()}" already exists.`});
         }
         res.status(500).json({ message: 'Server error updating goal', error: error.message });
     }
     // No client.release() needed if not using transactions or explicit client checkout here
};


// @desc    Delete a CUSTOM goal
// @route   DELETE /api/goals/:goalId
// @access  Private
export const deleteGoal = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId; // Expecting UUID string
    const { goalId } = req.params; // Expecting UUID string

    // Validation
    if (!userId || !isValidUUID(userId)) { return res.status(401).json({ message: 'Not authorized or invalid user ID' }); }
    if (!goalId || !isValidUUID(goalId)) { return res.status(400).json({ message: 'Valid Goal ID is required in URL' }); }
    console.log(`[GoalCtrl] Deleting goal ${goalId} for user ${userId}`);

    try {
        const deleteResult = await pool.query<{ goal_id: string }>(
            'DELETE FROM goals WHERE goal_id = $1 AND user_id = $2 RETURNING goal_id',
            [goalId, userId]
        );

        if (deleteResult.rowCount === 0) {
            console.log(`[GoalCtrl] Goal ${goalId} not found or not owned by user ${userId}`);
            return res.status(404).json({ message: 'Goal not found or not authorized to delete' });
        }

        console.log(`[GoalCtrl] Deleted goal ${deleteResult.rows[0].goal_id} successfully`);
        res.status(200).json({ message: 'Goal deleted successfully', deletedGoalId: deleteResult.rows[0].goal_id });
    } catch (error: any) {
        console.error('[GoalCtrl] Error deleting goal:', error);
        res.status(500).json({ message: 'Server error deleting goal', error: error.message });
    }
};