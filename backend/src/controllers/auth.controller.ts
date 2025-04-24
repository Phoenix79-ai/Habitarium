// backend/src/controllers/auth.controller.ts (Complete: Includes deleteUserProfile)
import { Request, Response } from 'express';
import pool from '../config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PoolClient } from 'pg';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// --- User Registration ---
export const registerUser = async (req: Request, res: Response) => {
    console.log('[auth.controller] --- ENTERING registerUser ---');
    const { username, email, password } = req.body;
    if (!username || !email || !password) { return res.status(400).json({ message: 'Username, email, and password are required' }); }
    console.log('[auth.controller] Register attempt:', { username, email });
    let client: PoolClient | null = null;
    try {
        client = await pool.connect();
        const checkUserSql = 'SELECT id FROM users WHERE username = $1 OR email = $2';
        const checkResult = await client.query(checkUserSql, [username, email]);
        if (checkResult.rows.length > 0) { return res.status(409).json({ message: 'Username or email already exists' }); }
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const insertUserSql = `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at`;
        const insertResult = await client.query(insertUserSql, [username, email, passwordHash]);
        if (insertResult.rows.length === 0) { return res.status(500).json({ message: 'Server error during user creation.' }); }
        const newUser = insertResult.rows[0];
        console.log('[auth.controller] User registered successfully:', newUser);
        return res.status(201).json({
            message: 'User registered successfully',
            user: { id: newUser.id, username: newUser.username, email: newUser.email, createdAt: newUser.created_at }
        });
    } catch (error) { console.error('[auth.controller] Register Error:', error); return res.status(500).json({ message: 'Server error during registration' }); }
    finally { client?.release(); console.log('[auth.controller] DB Client released'); }
};

// --- User Login ---
export const loginUser = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) { return res.status(400).json({ message: 'Email and password are required' }); }
    console.log('[auth.controller] Login attempt:', { email });
    let client: PoolClient | null = null;
    try {
        client = await pool.connect();
        const findUserSql = 'SELECT id, username, email, password_hash FROM users WHERE email = $1';
        const findResult = await client.query(findUserSql, [email]);
        if (findResult.rows.length === 0) { return res.status(401).json({ message: 'Invalid email or password' }); }
        const user = findResult.rows[0];
        const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordMatch) { return res.status(401).json({ message: 'Invalid email or password' }); }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) { return res.status(500).json({ message: 'Login failed due to server configuration error.' }); }
        const payload = { userId: user.id, username: user.username };
        const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
        console.log('[auth.controller] Login successful, token generated for:', { email, userId: user.id });
        return res.status(200).json({
            message: 'Login successful', token: token,
            user: { id: user.id, username: user.username, email: user.email } // Send back basic user info
        });
    } catch (error) { console.error('[auth.controller] Login Error:', error); return res.status(500).json({ message: 'Server error during login' }); }
    finally { client?.release(); console.log('[auth.controller] DB Client released on login path'); }
};

// --- Get User Profile ---
export const getUserProfile = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId;
    console.log(`[AuthCtrl] Attempting to get profile for user: ${userId}`);
    if (!userId) { return res.status(401).json({ message: 'User not identified' }); }
    let client: PoolClient | null = null;
    try {
        client = await pool.connect();
        const getUserSql = `SELECT id, username, email, xp, level, hp, created_at, active_title FROM users WHERE id = $1`;
        const result = await client.query(getUserSql, [userId]);
        if (result.rows.length === 0) { return res.status(404).json({ message: 'User profile not found' }); }
        const userProfile = result.rows[0];
        console.log(`[AuthCtrl] Profile retrieved for user ${userId}`); // Removed profile data log for brevity
        return res.status(200).json({ message: 'User profile retrieved successfully', user: userProfile });
    } catch (error) { console.error('[AuthCtrl] Error getting user profile:', error); return res.status(500).json({ message: 'Server error retrieving profile' }); }
    finally { client?.release(); console.log(`[AuthCtrl] DB Client released after get profile attempt for user ${userId}`); }
};

// --- Update Active Title ---
export const updateActiveTitle = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId;
    const { title } = req.body;
    console.log(`[AuthCtrl] User ${userId} attempting to set active title to: ${title}`);
    if (!userId) { return res.status(401).json({ message: 'User not identified' }); }
    if (title !== null && typeof title !== 'string') { return res.status(400).json({ message: 'Invalid title format provided.' }); }
    let client: PoolClient | null = null;
    try {
        client = await pool.connect();
        const updateTitleSql = `UPDATE users SET active_title = $1 WHERE id = $2 RETURNING id, active_title`;
        const result = await client.query(updateTitleSql, [title, userId]);
        if (result.rows.length === 0) { return res.status(404).json({ message: 'User not found' }); }
        const updatedProfile = result.rows[0];
        console.log(`[AuthCtrl] Active title updated successfully for user ${userId}:`, updatedProfile);
        return res.status(200).json({ message: 'Active title updated successfully', user: { active_title: updatedProfile.active_title } });
    } catch (error) { console.error('[AuthCtrl] Error updating active title:', error); return res.status(500).json({ message: 'Server error updating title' }); }
    finally { client?.release(); }
};

// --- Delete User Profile (Added) ---
export const deleteUserProfile = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId; // Get userId from token
    console.log(`[AuthCtrl] Attempting to DELETE profile for user: ${userId}`);
    if (!userId) { return res.status(401).json({ message: 'User not identified' }); }

    let client: PoolClient | null = null;
    try {
        client = await pool.connect();
        // Rely on ON DELETE CASCADE constraints for related data (habits, logs, rewards)
        const deleteUserSql = `DELETE FROM users WHERE id = $1 RETURNING id`;
        const result = await client.query(deleteUserSql, [userId]);

        if (result.rowCount === 0) {
            console.warn(`[AuthCtrl] Failed to delete user ${userId}, user not found.`);
            return res.status(404).json({ message: 'User not found, cannot delete' });
        }
        console.log(`[AuthCtrl] User profile ${userId} deleted successfully.`);
        return res.status(200).json({ message: 'User account deleted successfully' });

    } catch (error) {
        console.error('[AuthCtrl] Error deleting user profile:', error);
        return res.status(500).json({ message: 'Server error deleting account' });
    } finally {
        client?.release();
    }
};