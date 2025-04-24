// src/controllers/log.controller.ts
import { Response } from 'express';
import pool from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { PoolClient } from 'pg';

// Get user's habit logs with filtering
export const getUserLogs = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId;
    // Extract query parameters
    const { habitId, startDate, endDate } = req.query;

    console.log(`[LogCtrl] Attempting to get logs for user: ${userId}`, { habitId, startDate, endDate });

    if (!userId) {
        console.error('[LogCtrl] Critical: userId missing in getUserLogs.');
        return res.status(401).json({ message: 'User not identified' });
    }

    let client: PoolClient | null = null;

    try {
        client = await pool.connect();

        // Base query
        let getLogsSql = `
            SELECT hl.id, hl.habit_id, h.name as habit_name, hl.log_date, hl.created_at
            FROM habit_logs hl
            JOIN habits h ON hl.habit_id = h.id
            WHERE hl.user_id = $1
        `; // Join with habits table to get habit name

        const queryParams: any[] = [userId];
        let paramIndex = 2; // Start parameter index at $2

        // Add filters based on query parameters
        if (habitId && typeof habitId === 'string') {
            getLogsSql += ` AND hl.habit_id = $${paramIndex}`;
            queryParams.push(habitId);
            paramIndex++;
        }
        if (startDate && typeof startDate === 'string') {
            // Basic validation - ensure it looks like a date YYYY-MM-DD
            if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
                return res.status(400).json({ message: 'Invalid startDate format (use YYYY-MM-DD)' });
            }
            getLogsSql += ` AND hl.log_date >= $${paramIndex}`;
            queryParams.push(startDate);
            paramIndex++;
        }
        if (endDate && typeof endDate === 'string') {
             if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
                return res.status(400).json({ message: 'Invalid endDate format (use YYYY-MM-DD)' });
            }
            getLogsSql += ` AND hl.log_date <= $${paramIndex}`;
            queryParams.push(endDate);
            paramIndex++;
        }

        // Add ordering
        getLogsSql += ` ORDER BY hl.log_date DESC, h.name ASC`; // Order by date, then habit name

        console.log(`[LogCtrl] Executing SQL: ${getLogsSql.replace(/\s+/g, ' ')} with params:`, queryParams); // Log query

        // Execute the constructed query
        const result = await client.query(getLogsSql, queryParams);
        const logs = result.rows;

        console.log(`[LogCtrl] Found ${logs.length} logs for user ${userId} with specified filters.`);

        // Return the array of logs
        return res.status(200).json({
            message: 'User logs retrieved successfully',
            logs: logs
        });

    } catch (error) {
        console.error('[LogCtrl] Error getting user logs:', error);
        return res.status(500).json({ message: 'Server error retrieving logs' });
    } finally {
        client?.release();
        console.log(`[LogCtrl] DB Client released after get logs attempt for user ${userId}`);
    }
};