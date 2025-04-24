// src/routes/habit.routes.ts
import { Router } from 'express';
import { protect } from '../middleware/auth.middleware'; // Import the protect middleware
import * as habitController from '../controllers/habit.controller'; // We'll create this next

const router = Router();

// Apply protect middleware to ALL routes in this file
router.use(protect);

// Define Habit CRUD routes
// POST /api/habits - Create a new habit
router.post('/', habitController.createHabit);

// GET /api/habits - Get all habits for the logged-in user
router.get('/', habitController.getUserHabits);

// --- ADD THIS ROUTE ---
// POST /api/habits/:habitId/log - Log completion for a specific habit
router.post('/:habitId/log', habitController.logHabitCompletion);
// --- END OF ADDED ROUTE ---

// GET /api/habits/:id - Get a specific habit by ID
// router.get('/:id', habitController.getHabitById); // Implement later

// PUT /api/habits/:id - Update a specific habit
router.put('/:id', habitController.updateHabit); // Implement later

// DELETE /api/habits/:id - Delete a specific habit
router.delete('/:id', habitController.deleteHabit); // Implement later

export default router;