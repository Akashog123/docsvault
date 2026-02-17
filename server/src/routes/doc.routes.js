import { Router } from 'express';
import multer from 'multer';
import { getAllDocs, getDocById, uploadDoc, deleteDoc, shareDoc, uploadVersion, searchDocs } from '../controllers/doc.controller.js';
import authenticate from '../middleware/authenticate.js';
import attachSubscription from '../middleware/attachSubscription.js';
import checkFeature from '../middleware/checkFeature.js';
import checkUsageLimit from '../middleware/checkUsageLimit.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

// All plans — basic CRUD
router.get('/', authenticate, attachSubscription, getAllDocs);
router.get('/search', authenticate, attachSubscription, checkFeature('advanced_search'), searchDocs);
router.get('/:id', authenticate, attachSubscription, getDocById);
router.post('/', authenticate, attachSubscription, checkFeature('doc_crud'), checkUsageLimit('maxDocuments'), upload.single('file'), uploadDoc);
router.delete('/:id', authenticate, attachSubscription, deleteDoc);

// Pro+ features
router.post('/:id/share', authenticate, attachSubscription, checkFeature('sharing'), shareDoc);
router.post('/:id/version', authenticate, attachSubscription, checkFeature('versioning'), checkUsageLimit('maxDocuments'), upload.single('file'), uploadVersion);

export default router;
