import { Router } from 'express';
import { getOrg, addUser, generateInviteCode, getInviteCode } from '../controllers/org.controller.js';
import authenticate from '../middleware/authenticate.js';
import attachSubscription from '../middleware/attachSubscription.js';
import adminOnly from '../middleware/adminOnly.js';

const router = Router();

// View org details and members - only org admin
router.get('/', authenticate, attachSubscription, adminOnly, getOrg);
// Add user to org - only org admin
router.post('/users', authenticate, attachSubscription, adminOnly, addUser);
// Manage invite codes - only org admin
router.get('/invite-code', authenticate, adminOnly, getInviteCode);
router.post('/invite-code', authenticate, adminOnly, generateInviteCode);

export default router;
