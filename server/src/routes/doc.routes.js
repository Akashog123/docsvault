import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getAllDocs, getDocById, uploadDoc, deleteDoc, shareDoc, uploadVersion, searchDocs, downloadDoc, updateDoc } from '../controllers/doc.controller.js';
import authenticate from '../middleware/authenticate.js';
import attachSubscription from '../middleware/attachSubscription.js';
import checkFeature from '../middleware/checkFeature.js';
import checkUsageLimit from '../middleware/checkUsageLimit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const router = Router();

// Configure multer for disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// All plans — basic CRUD
router.get('/', authenticate, attachSubscription, checkFeature('doc_crud'), getAllDocs);
router.get('/search', authenticate, attachSubscription, checkFeature('advanced_search'), searchDocs);
router.get('/:id', authenticate, attachSubscription, checkFeature('doc_crud'), getDocById);
router.get('/:id/download', authenticate, attachSubscription, checkFeature('doc_crud'), downloadDoc);
router.post('/', authenticate, attachSubscription, checkFeature('doc_crud'), checkUsageLimit('maxDocuments'), checkUsageLimit('maxStorage'), upload.single('file'), uploadDoc);
router.put('/:id', authenticate, attachSubscription, checkFeature('doc_crud'), updateDoc);
router.delete('/:id', authenticate, attachSubscription, checkFeature('doc_crud'), deleteDoc);

// Pro+ features
router.post('/:id/share', authenticate, attachSubscription, checkFeature('sharing'), shareDoc);
router.post('/:id/version', authenticate, attachSubscription, checkFeature('versioning'), checkUsageLimit('maxDocuments'), checkUsageLimit('maxStorage'), upload.single('file'), uploadVersion);

export default router;
