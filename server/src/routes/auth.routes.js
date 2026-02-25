import { Router } from 'express';
import { register, login, getMe, setupPlatform, checkSetup } from '../controllers/auth.controller.js';
import authenticate from '../middleware/authenticate.js';

const router = Router();

// Platform Initialization
router.get('/check-setup', checkSetup);
router.post('/setup', setupPlatform);

// Standard Auth
router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);

export default router;
