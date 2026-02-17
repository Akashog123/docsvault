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
    enum: ['doc_crud', 'sharing', 'versioning', 'advanced_search']
  }],
  limits: {
    maxDocuments: {
      type: Number,
      required: true  // -1 = unlimited
    }
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export default mongoose.model('Plan', planSchema);
