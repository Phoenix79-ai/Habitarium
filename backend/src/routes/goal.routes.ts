// backend/src/routes/goal.routes.ts
import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
// Make sure you only have ONE line importing from goal.controller, and it includes ALL functions needed
import { createGoal, deleteGoal, getUserGoals, getGoalTemplates, addGoalFromTemplate } from '../controllers/goal.controller';

const router = Router();

// Public route for templates - Define BEFORE protected routes using similar path parts
router.get('/templates', getGoalTemplates);

// Route for adding a template to user's goals (requires protection)
router.post('/templates/:templateId/add', protect, addGoalFromTemplate);

// Apply protect middleware to all goal routes
// Ensures only logged-in users can access these
router.use(protect);

router.get('/', getUserGoals);       // GET /api/goals - Get all goals for the logged-in user
router.post('/', createGoal);        // POST /api/goals - Create a new goal
router.delete('/:goalId', deleteGoal); // DELETE /api/goals/:goalId - Delete a specific goal

export default router;