// src/routes/log.routes.ts
import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import * as logController from '../controllers/log.controller'; // Create this next

const router = Router();

// Protect all log routes
router.use(protect);

// GET /api/logs - Get logs for the logged-in user, with optional filters
router.get('/', logController.getUserLogs);

export default router;