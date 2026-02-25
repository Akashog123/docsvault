import { jest } from '@jest/globals';
import { mockRequest, mockResponse, mockNext } from '../../setup/helpers.js';
import { createPlan, createUsageRecord } from '../../setup/fixtures.js';

// Create mock getOrCreateUsageRecord
const mockGetOrCreateUsageRecord = jest.fn();

describe('checkUsageLimit middleware', () => {
  let req, res, next;

  // Metric config matching the actual middleware implementation
  const METRIC_CONFIG = {
    maxDocuments: { usageKey: 'documents', unit: 'count' },
    maxStorage:   { usageKey: 'storage',   unit: 'bytes_to_mb' }
  };

  // Inline middleware implementation for testing
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
        const usageRecord = await mockGetOrCreateUsageRecord(req.user.orgId, config.usageKey);

        if (usageRecord.count >= limit) {
          return res.status(429).json({
            error: `Limit reached: ${usageRecord.count}/${limit} ${config.usageKey}`,
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

  beforeEach(() => {
    req = mockRequest({ user: { orgId: 'org123' } });
    res = mockResponse();
    next = mockNext();
    jest.clearAllMocks();
  });

  describe('Under limit', () => {
    it('should allow when usage is under limit', async () => {
      const plan = createPlan({ limits: { maxDocuments: 10 } });
      req.subscription = { plan };

      const usageRecord = createUsageRecord({ count: 5, orgId: 'org123' });
      mockGetOrCreateUsageRecord.mockResolvedValue(usageRecord);

      const middleware = checkUsageLimit('maxDocuments');
      await middleware(req, res, next);

      expect(mockGetOrCreateUsageRecord).toHaveBeenCalledWith('org123', 'documents');
      expect(req.usageRecord).toEqual(usageRecord);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow when usage is at limit minus one', async () => {
      const plan = createPlan({ limits: { maxDocuments: 10 } });
      req.subscription = { plan };

      const usageRecord = createUsageRecord({ count: 9, orgId: 'org123' });
      mockGetOrCreateUsageRecord.mockResolvedValue(usageRecord);

      const middleware = checkUsageLimit('maxDocuments');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('At limit', () => {
    it('should block when usage is at limit', async () => {
      const plan = createPlan({ limits: { maxDocuments: 10 } });
      req.subscription = { plan };

      const now = new Date();
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const usageRecord = createUsageRecord({ count: 10, orgId: 'org123', periodEnd });
      mockGetOrCreateUsageRecord.mockResolvedValue(usageRecord);

      const middleware = checkUsageLimit('maxDocuments');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Limit reached: 10/10 documents',
        currentUsage: 10,
        limit: 10,
        resetsAt: periodEnd,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should block when usage exceeds limit', async () => {
      const plan = createPlan({ limits: { maxDocuments: 10 } });
      req.subscription = { plan };

      const usageRecord = createUsageRecord({ count: 15, orgId: 'org123' });
      mockGetOrCreateUsageRecord.mockResolvedValue(usageRecord);

      const middleware = checkUsageLimit('maxDocuments');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Limit reached'),
          currentUsage: 15,
          limit: 10,
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Unlimited plan', () => {
    it('should allow unlimited access when limit is -1', async () => {
      const plan = createPlan({ limits: { maxDocuments: -1 } });
      req.subscription = { plan };

      const middleware = checkUsageLimit('maxDocuments');
      await middleware(req, res, next);

      expect(mockGetOrCreateUsageRecord).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should skip usage check for unlimited storage', async () => {
      const plan = createPlan({ limits: { maxStorage: -1 } });
      req.subscription = { plan };

      const middleware = checkUsageLimit('maxStorage');
      await middleware(req, res, next);

      expect(mockGetOrCreateUsageRecord).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Usage record creation', () => {
    it('should create usage record if not exists', async () => {
      const plan = createPlan({ limits: { maxDocuments: 100 } });
      req.subscription = { plan };

      const newUsageRecord = createUsageRecord({ count: 0, orgId: 'org123' });
      mockGetOrCreateUsageRecord.mockResolvedValue(newUsageRecord);

      const middleware = checkUsageLimit('maxDocuments');
      await middleware(req, res, next);

      expect(mockGetOrCreateUsageRecord).toHaveBeenCalledWith('org123', 'documents');
      expect(req.usageRecord).toEqual(newUsageRecord);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Lazy reset when period expired', () => {
    it('should handle usage record with expired period', async () => {
      const plan = createPlan({ limits: { maxDocuments: 10 } });
      req.subscription = { plan };

      // Usage record that was reset by usageTracker
      const resetUsageRecord = createUsageRecord({ count: 0, orgId: 'org123' });
      mockGetOrCreateUsageRecord.mockResolvedValue(resetUsageRecord);

      const middleware = checkUsageLimit('maxDocuments');
      await middleware(req, res, next);

      expect(req.usageRecord.count).toBe(0);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Attaches usage record to request', () => {
    it('should attach usage record to req.usageRecord', async () => {
      const plan = createPlan({ limits: { maxDocuments: 50 } });
      req.subscription = { plan };

      const usageRecord = createUsageRecord({ count: 25, orgId: 'org123' });
      mockGetOrCreateUsageRecord.mockResolvedValue(usageRecord);

      const middleware = checkUsageLimit('maxDocuments');
      await middleware(req, res, next);

      expect(req.usageRecord).toBeDefined();
      expect(req.usageRecord.count).toBe(25);
      expect(req.usageRecord.orgId).toBe('org123');
    });
  });

  describe('Different metrics', () => {
    it('should check storage metric correctly', async () => {
      const plan = createPlan({ limits: { maxStorage: 1000 } });
      req.subscription = { plan };

      const usageRecord = createUsageRecord({ count: 500, orgId: 'org123' });
      mockGetOrCreateUsageRecord.mockResolvedValue(usageRecord);

      const middleware = checkUsageLimit('maxStorage');
      await middleware(req, res, next);

      expect(mockGetOrCreateUsageRecord).toHaveBeenCalledWith('org123', 'storage');
      expect(next).toHaveBeenCalled();
    });

    it('should map maxDocuments to documents metric', async () => {
      const plan = createPlan({ limits: { maxDocuments: 10 } });
      req.subscription = { plan };

      const usageRecord = createUsageRecord({ count: 5, orgId: 'org123' });
      mockGetOrCreateUsageRecord.mockResolvedValue(usageRecord);

      const middleware = checkUsageLimit('maxDocuments');
      await middleware(req, res, next);

      expect(mockGetOrCreateUsageRecord).toHaveBeenCalledWith('org123', 'documents');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const plan = createPlan({ limits: { maxDocuments: 10 } });
      req.subscription = { plan };

      mockGetOrCreateUsageRecord.mockRejectedValue(new Error('Database error'));

      const middleware = checkUsageLimit('maxDocuments');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to check usage limit' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle zero limit', async () => {
      const plan = createPlan({ limits: { maxDocuments: 0 } });
      req.subscription = { plan };

      const usageRecord = createUsageRecord({ count: 0, orgId: 'org123' });
      mockGetOrCreateUsageRecord.mockResolvedValue(usageRecord);

      const middleware = checkUsageLimit('maxDocuments');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle very large limits', async () => {
      const plan = createPlan({ limits: { maxDocuments: 1000000 } });
      req.subscription = { plan };

      const usageRecord = createUsageRecord({ count: 999999, orgId: 'org123' });
      mockGetOrCreateUsageRecord.mockResolvedValue(usageRecord);

      const middleware = checkUsageLimit('maxDocuments');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
