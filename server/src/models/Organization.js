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
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  inviteCode: {
    type: String,
    unique: true,
    sparse: true, // Allows null values, but must be unique if present
    trim: true
  }
}, { timestamps: true });


export default mongoose.model('Organization', organizationSchema);
