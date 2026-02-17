import { getOrCreateUsageRecord } from '../utils/usageTracker.js';

const checkUsageLimit = (metric) => {
  return async (req, res, next) => {
    try {
      const { plan } = req.subscription;
      const limit = plan.limits[metric];

      // -1 means unlimited
      if (limit === -1) {
        return next();
      }

      const usageRecord = await getOrCreateUsageRecord(req.user.orgId, metric === 'maxDocuments' ? 'documents' : metric);

      if (usageRecord.count >= limit) {
        return res.status(429).json({
          error: `Limit reached: ${usageRecord.count}/${limit} ${metric === 'maxDocuments' ? 'documents' : metric}`,
          currentUsage: usageRecord.count,
          limit,
          resetsAt: usageRecord.periodEnd
        });
      }

      req.usageRecord = usageRecord;
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Failed to check usage limit' });
    }
  };
};

export default checkUsageLimit;
