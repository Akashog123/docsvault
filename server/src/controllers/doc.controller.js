import Document from '../models/Document.js';
import { incrementUsage, decrementUsage } from '../utils/usageTracker.js';

export const getAllDocs = async (req, res) => {
  try {
    const docs = await Document.find({ orgId: req.user.orgId })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDocById = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, orgId: req.user.orgId })
      .populate('uploadedBy', 'name email')
      .populate('sharedWith', 'name email');

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      orgId: req.user.orgId,
      uploadedBy: req.user.userId,
      versions: [{
        versionNumber: 1,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        uploadedBy: req.user.userId,
        uploadedAt: new Date()
      }],
      currentVersion: 1
    });

    await incrementUsage(req.user.orgId, 'documents');

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteDoc = async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({
      _id: req.params.id,
      orgId: req.user.orgId
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await decrementUsage(req.user.orgId, 'documents');

    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const shareDoc = async (req, res) => {
  try {
    const { userIds } = req.body;

    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId },
      { $addToSet: { sharedWith: { $each: userIds } } },
      { new: true }
    ).populate('sharedWith', 'name email');

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    const newVersionNumber = doc.currentVersion + 1;
    doc.versions.push({
      versionNumber: newVersionNumber,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadedBy: req.user.userId,
      uploadedAt: new Date()
    });
    doc.currentVersion = newVersionNumber;
    doc.fileName = req.file.originalname;
    doc.fileSize = req.file.size;
    await doc.save();

    await incrementUsage(req.user.orgId, 'documents');

    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const searchDocs = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const docs = await Document.find({
      orgId: req.user.orgId,
      $text: { $search: q }
    })
      .populate('uploadedBy', 'name email')
      .sort({ score: { $meta: 'textScore' } });

    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
