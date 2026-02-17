import { Router } from 'express';
import { getAllPlans } from '../controllers/plan.controller.js';

const router = Router();

router.get('/', getAllPlans);

export default router;
