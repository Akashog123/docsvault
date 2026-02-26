import Document from '../models/Document.js';
import { incrementUsage, decrementUsage } from '../utils/usageTracker.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isServerless = !!process.env.VERCEL;
const uploadDir = isServerless
  ? '/tmp/uploads'
  : path.join(__dirname, '../../uploads');

// Build a visibility filter: admins see all org docs, members see only own + shared
const visibilityFilter = (req) => {
  const filter = { orgId: req.user.orgId };
  if (req.user.role !== 'admin') {
    filter.$or = [
      { uploadedBy: req.user.userId },
      { sharedWith: req.user.userId }
    ];
  }
  return filter;
};

// Check if the requesting user is the document owner
const isOwner = (doc, userId) => {
  const ownerId = doc.uploadedBy?._id || doc.uploadedBy;
  return ownerId.toString() === userId.toString();
};

export const getAllDocs = async (req, res) => {
  try {
    const docs = await Document.find(visibilityFilter(req))
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDocById = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, ...visibilityFilter(req) })
      .populate('uploadedBy', 'name email')
      .populate('sharedWith', 'name email');

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const uploadDoc = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const doc = await Document.create({
      title,
      description: description || '',
      fileName: req.file.filename, // Store the unique filename for disk access
      originalFileName: req.file.originalname, // Keep original name for display
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      orgId: req.user.orgId,
      uploadedBy: req.user.userId,
      versions: [{
        versionNumber: 1,
        fileName: req.file.filename,
        originalFileName: req.file.originalname,
        fileSize: req.file.size,
        uploadedBy: req.user.userId,
        uploadedAt: new Date()
      }],
      currentVersion: 1
    });

    await incrementUsage(req.user.orgId, 'documents');
    await incrementUsage(req.user.orgId, 'storage', req.file.size);

    res.status(201).json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteDoc = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, orgId: req.user.orgId });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Only owner or admin can delete
    if (req.user.role !== 'admin' && !isOwner(doc, req.user.userId)) {
      return res.status(403).json({ error: 'Only the document owner can delete this document' });
    }

    await Document.deleteOne({ _id: doc._id });

    // Delete file from disk if it exists
    const filePath = path.join(uploadDir, doc.fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Calculate total storage including all versions
    const totalStorage = doc.fileSize + (doc.versions?.reduce((sum, v) => sum + (v.fileSize || 0), 0) || 0);

    // Only decrement one document count for the main document
    await decrementUsage(req.user.orgId, 'documents', 1);
    await decrementUsage(req.user.orgId, 'storage', totalStorage);

    res.json({ message: 'Document deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateDoc = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Fetch first to check ownership
    const existing = await Document.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!existing) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (req.user.role !== 'admin' && !isOwner(existing, req.user.userId)) {
      return res.status(403).json({ error: 'Only the document owner can edit this document' });
    }

    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId },
      { title, description },
      { returnDocument: 'after' }
    ).populate('uploadedBy', 'name email');

    res.json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const shareDoc = async (req, res) => {
  try {
    const { userIds } = req.body;

    // Fetch first to check ownership
    const existing = await Document.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!existing) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (req.user.role !== 'admin' && !isOwner(existing, req.user.userId)) {
      return res.status(403).json({ error: 'Only the document owner can share this document' });
    }

    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId },
      { $addToSet: { sharedWith: { $each: userIds } } },
      { returnDocument: 'after' }
    ).populate('uploadedBy', 'name email').populate('sharedWith', 'name email');

    res.json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const uploadVersion = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const doc = await Document.findOne({ _id: req.params.id, orgId: req.user.orgId });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Only owner or admin can upload new versions
    if (req.user.role !== 'admin' && !isOwner(doc, req.user.userId)) {
      return res.status(403).json({ error: 'Only the document owner can upload new versions' });
    }

    const newVersionNumber = doc.currentVersion + 1;
    doc.versions.push({
      versionNumber: newVersionNumber,
      fileName: req.file.filename,
      originalFileName: req.file.originalname,
      fileSize: req.file.size,
      uploadedBy: req.user.userId,
      uploadedAt: new Date()
    });
    doc.currentVersion = newVersionNumber;
    doc.fileName = req.file.filename;
    doc.fileSize = req.file.size;
    await doc.save();

    // Do not increment documents count for new versions, only storage
    await incrementUsage(req.user.orgId, 'storage', req.file.size);

    res.json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const searchDocs = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const docs = await Document.find({
      ...visibilityFilter(req),
      $text: { $search: q }
    })
      .populate('uploadedBy', 'name email')
      .sort({ score: { $meta: 'textScore' } });

    res.json(docs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const downloadDoc = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, ...visibilityFilter(req) });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const filePath = path.join(uploadDir, doc.fileName);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Use original filename for download so user sees meaningful name
    const downloadName = doc.originalFileName || doc.fileName;
    res.download(filePath, downloadName);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
