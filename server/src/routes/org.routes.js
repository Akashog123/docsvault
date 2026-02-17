import { Router } from 'express';
import { getOrg, addUser } from '../controllers/org.controller.js';
import authenticate from '../middleware/authenticate.js';
import attachSubscription from '../middleware/attachSubscription.js';
import adminOnly from '../middleware/adminOnly.js';

const router = Router();

router.get('/', authenticate, attachSubscription, getOrg);
router.post('/users', authenticate, attachSubscription, adminOnly, addUser);

export default router;
