// src/server.ts
import dotenv from 'dotenv';
// Load environment variables IMMEDIATELY at the top
dotenv.config();

// Imports
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
// Removed fs and path as they weren't used here
// import pool from './config/db'; // Pool is used in controllers/db.ts, not directly here

// --- Import Route Handlers ---
import authRoutes from './routes/auth.routes';
import habitRoutes from './routes/habit.routes';
import logRoutes from './routes/log.routes';
import rewardRoutes from './routes/reward.routes'; // <-- Import reward routes

// Initialize express application
const app: Express = express();

// Get port from environment variables or default to 3001
const PORT = process.env.BACKEND_PORT || 3001;

// --- Global Middleware ---
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON request bodies

// Simple request logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next(); // Pass control to the next middleware/route handler
});

// --- API Routes ---

// Health check endpoint (public)
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'Backend is healthy!', timestamp: new Date().toISOString() });
});

// Mount routers for different resource types
app.use('/api/auth', authRoutes);      // Authentication routes (register, login, profile)
app.use('/api/habits', habitRoutes);   // Habit routes (CRUD, log)
app.use('/api/logs', logRoutes);       // Log retrieval routes
app.use('/api/rewards', rewardRoutes); // <-- Mount reward routes (list, redeem)

// --- Catch-all for 404 Not Found (Optional) ---
// Place this after all other specific routes
app.use((req: Request, res: Response) => {
    res.status(404).json({ message: 'Resource not found on this server.' });
});


// --- Global Error Handling Middleware (Basic) ---
// Must have 4 arguments for Express to recognize it as error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled Error:", err.stack || err);
  // Avoid sending stack trace in production
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  // Initial DB connection test is usually done in the db config file itself (db.ts)
  // to ensure the pool is ready before the server starts listening.
});