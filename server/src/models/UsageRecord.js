import mongoose from 'mongoose';

const usageRecordSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  metric: {
    type: String,
    required: true,
    default: 'documents'
  },
  count: {
    type: Number,
    default: 0
  },
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  lastResetAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

usageRecordSchema.index(
  { orgId: 1, metric: 1, periodStart: 1 },
  { unique: true }
);

export default mongoose.model('UsageRecord', usageRecordSchema);
