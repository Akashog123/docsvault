import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  }
}, { timestamps: true });

organizationSchema.index({ slug: 1 }, { unique: true });

export default mongoose.model('Organization', organizationSchema);
