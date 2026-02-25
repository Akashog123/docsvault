import UsageRecord from '../models/UsageRecord.js';

const getPeriodBounds = () => {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { periodStart, periodEnd };
};

export const getOrCreateUsageRecord = async (orgId, metric = 'documents') => {
  const { periodStart, periodEnd } = getPeriodBounds();

  // Atomically reset any stale record for this org+metric
  await UsageRecord.findOneAndUpdate(
    { orgId, metric, periodEnd: { $lt: new Date() } },
    { $set: { count: 0, periodStart, periodEnd, lastResetAt: new Date() } }
  );

  // Get or create the current-period record
  return UsageRecord.findOneAndUpdate(
    { orgId, metric, periodStart },
    {
      $setOnInsert: {
        orgId,
        metric,
        count: 0,
        periodStart,
        periodEnd,
        lastResetAt: new Date()
      }
    },
    { upsert: true, returnDocument: 'after' }
  );
};

export const incrementUsage = async (orgId, metric = 'documents', amount = 1) => {
  const { periodStart, periodEnd } = getPeriodBounds();

  return UsageRecord.findOneAndUpdate(
    { orgId, metric, periodStart },
    {
      $inc: { count: amount },
      $setOnInsert: {
        periodEnd,
        lastResetAt: new Date()
      }
    },
    { upsert: true, returnDocument: 'after' }
  );
};

export const decrementUsage = async (orgId, metric = 'documents', amount = 1) => {
  const { periodStart } = getPeriodBounds();

  return UsageRecord.findOneAndUpdate(
    { orgId, metric, periodStart, count: { $gte: amount } },
    { $inc: { count: -amount } },
    { returnDocument: 'after' }
  );
};
