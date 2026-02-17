import { Router } from 'express';
import { getCurrentSubscription, changePlan } from '../controllers/subscription.controller.js';
import authenticate from '../middleware/authenticate.js';
import attachSubscription from '../middleware/attachSubscription.js';
import adminOnly from '../middleware/adminOnly.js';

const router = Router();

router.get('/', authenticate, attachSubscription, getCurrentSubscription);
router.post('/change', authenticate, adminOnly, changePlan);

export default router;
