// backend/src/routes/auth.routes.ts
import express, { Router } from 'express';
// --- FIX: Add deleteUserProfile to the import list ---
import { registerUser, loginUser, getUserProfile, updateActiveTitle, deleteUserProfile } from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.get('/profile', protect, getUserProfile);
router.put('/profile/title', protect, updateActiveTitle);
router.delete('/profile', protect, deleteUserProfile); // This line is now correct

export default router;