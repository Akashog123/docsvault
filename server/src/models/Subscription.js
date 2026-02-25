import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired'],
    default: 'active'
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  }
}, { timestamps: true });

subscriptionSchema.index({ orgId: 1, status: 1 });
subscriptionSchema.index(
  { orgId: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

export default mongoose.model('Subscription', subscriptionSchema);
