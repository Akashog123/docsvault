import { Router } from 'express';
import { getAllPlans, createPlan, updatePlan } from '../controllers/plan.controller.js';
import authenticate from '../middleware/authenticate.js';
import superAdminOnly from '../middleware/superAdminOnly.js';

const router = Router();

// Public — list active plans
router.get('/', getAllPlans);

// Super admin only — manage plan configurations
router.post('/', authenticate, superAdminOnly, createPlan);
router.put('/:id', authenticate, superAdminOnly, updatePlan);

export default router;
