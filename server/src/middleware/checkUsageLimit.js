import { getOrCreateUsageRecord } from '../utils/usageTracker.js';

// Metric config: maps plan limit keys to usage tracking names and units.
// Count-based limits work without code changes (fallback on line 21).
// Non-count units (e.g., bytes_to_mb) require an entry here.
const METRIC_CONFIG = {
  maxDocuments: { usageKey: 'documents', unit: 'count' },
  maxStorage:   { usageKey: 'storage',   unit: 'bytes_to_mb' }
};

const checkUsageLimit = (metric) => {
  return async (req, res, next) => {
    try {
      const { plan } = req.subscription;
      const limit = plan.limits[metric];

      // No limit defined or unlimited (-1)
      if (limit === undefined || limit === null || limit === -1) {
        return next();
      }

      const config = METRIC_CONFIG[metric] || { usageKey: metric, unit: 'count' };
      const usageRecord = await getOrCreateUsageRecord(req.user.orgId, config.usageKey);
      const currentUsage = usageRecord.count;

      if (config.unit === 'bytes_to_mb') {
        // Usage stored in bytes, limit defined in MB
        const limitInBytes = limit * 1024 * 1024;
        if (currentUsage >= limitInBytes) {
          return res.status(429).json({
            error: `Storage limit reached: ${(currentUsage / (1024 * 1024)).toFixed(2)}/${limit} MB`,
            currentUsage: (currentUsage / (1024 * 1024)).toFixed(2),
            limit,
            unit: 'MB',
            resetsAt: usageRecord.periodEnd
          });
        }
      } else {
        if (currentUsage >= limit) {
          return res.status(429).json({
            error: `Limit reached: ${currentUsage}/${limit} ${config.usageKey}`,
            currentUsage,
            limit,
            resetsAt: usageRecord.periodEnd
          });
        }
      }

      req.usageRecord = usageRecord;
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Failed to check usage limit' });
    }
  };
};

export default checkUsageLimit;
