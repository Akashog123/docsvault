import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  features: [{
    type: String,
    trim: true
  }],
  limits: {
    type: mongoose.Schema.Types.Mixed,
    required: true,  // -1 = unlimited, e.g. { maxDocuments: 10, maxStorage: 100 }
    default: {}
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  color: {
    type: String,
    default: '#3b82f6', // Default blue
    trim: true,
    match: /^#([0-9a-fA-F]{3}){1,2}$/ // Ensure valid hex color
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export default mongoose.model('Plan', planSchema);
