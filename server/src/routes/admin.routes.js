import { Router } from 'express';
import { getAllOrganizations } from '../controllers/admin.controller.js';
import authenticate from '../middleware/authenticate.js';
import superAdminOnly from '../middleware/superAdminOnly.js';

const router = Router();

// Super admin only — list all organizations with their admins and members
router.get('/organizations', authenticate, superAdminOnly, getAllOrganizations);

export default router;
