// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend the Express Request type to include our custom 'user' property
// This allows TypeScript to know about req.user later
export interface AuthenticatedRequest extends Request {
    user?: { // Make user optional initially
        userId: string;
        username?: string; // Add other fields from JWT payload if needed
    };
}

export const protect = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    let token;

    // 1. Check if the Authorization header exists and starts with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 2. Extract the token (Bearer <token>)
            token = req.headers.authorization.split(' ')[1];

            // 3. Verify the token using the JWT_SECRET
            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                console.error('[AuthMiddleware] JWT_SECRET not found!');
                // Throw an error to be caught below
                throw new Error('Server configuration error');
            }

            // Verify token - this throws an error if invalid/expired
            const decoded = jwt.verify(token, jwtSecret) as { userId: string; username?: string; iat: number; exp: number }; // Type assertion

            // 4. Attach user info to the request object
            // We only add the necessary info (userId) from the token payload
            req.user = {
                userId: decoded.userId,
                username: decoded.username // Attach username if it's in the token
            };

            console.log('[AuthMiddleware] Token verified successfully for user:', req.user?.userId);
            // 5. Call next() to pass control to the next middleware/route handler
            next();

        } catch (error) {
            console.error('[AuthMiddleware] Token verification failed:', error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    // If no token found in the header
    if (!token) {
        console.warn('[AuthMiddleware] No token found in request');
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};