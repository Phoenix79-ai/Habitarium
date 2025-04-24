// backend/src/routes/reward.routes.ts
import express from 'express';
import { listRewards, redeemReward, getOwnedRewards } from '../controllers/reward.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

// Apply protect middleware to all routes in this file
router.use(protect);

// GET /api/rewards - List AVAILABLE rewards
router.get('/', listRewards);

// GET /api/rewards/owned - List rewards OWNED by the logged-in user
router.get('/owned', getOwnedRewards);

// POST /api/rewards/:rewardId/redeem - Redeem a specific reward
router.post('/:rewardId/redeem', redeemReward);

export default router;