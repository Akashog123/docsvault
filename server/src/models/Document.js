import mongoose from 'mongoose';

const versionSchema = new mongoose.Schema({
  versionNumber: { type: Number, required: true },
  fileName: { type: String }, // Unique, required: true filename on disk
  originalFileName: { type: String, required: true }, // Original user filename
  fileSize: { type: Number, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  fileName: {
    type: String,
    required: true
  },
  originalFileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  versions: [versionSchema],
  currentVersion: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

documentSchema.index({ orgId: 1 });
documentSchema.index({ title: 'text', description: 'text' });

export default mongoose.model('Document', documentSchema);
