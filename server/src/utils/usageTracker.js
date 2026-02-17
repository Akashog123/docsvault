import UsageRecord from '../models/UsageRecord.js';

const getPeriodBounds = () => {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { periodStart, periodEnd };
};

export const getOrCreateUsageRecord = async (orgId, metric = 'documents') => {
  const { periodStart, periodEnd } = getPeriodBounds();

  const record = await UsageRecord.findOneAndUpdate(
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
    { upsert: true, new: true }
  );

  // Lazy reset: if the record's periodEnd has passed, reset it
  if (record.periodEnd < new Date()) {
    record.count = 0;
    record.periodStart = periodStart;
    record.periodEnd = periodEnd;
    record.lastResetAt = new Date();
    await record.save();
  }

  return record;
};

export const incrementUsage = async (orgId, metric = 'documents') => {
  const { periodStart, periodEnd } = getPeriodBounds();

  return UsageRecord.findOneAndUpdate(
    { orgId, metric, periodStart },
    {
      $inc: { count: 1 },
      $setOnInsert: {
        periodEnd,
        lastResetAt: new Date()
      }
    },
    { upsert: true, new: true }
  );
};

export const decrementUsage = async (orgId, metric = 'documents') => {
  const { periodStart } = getPeriodBounds();

  return UsageRecord.findOneAndUpdate(
    { orgId, metric, periodStart, count: { $gt: 0 } },
    { $inc: { count: -1 } },
    { new: true }
  );
};
