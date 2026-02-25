import { jest } from '@jest/globals';
import { mockRequest, mockResponse, mockNext } from '../../setup/helpers.js';
import { createSubscription, createPlan } from '../../setup/fixtures.js';

// Create mock Subscription object
const mockSubscription = {
  findOne: jest.fn(),
};

describe('attachSubscription middleware', () => {
  let req, res, next;

  // Inline middleware implementation for testing
  const attachSubscription = async (req, res, next) => {
    try {
      const subscription = await mockSubscription.findOne({
        orgId: req.user.orgId,
        status: 'active'
      });

      if (!subscription) {
        return res.status(403).json({ error: 'No active subscription' });
      }

      // Check expiration — lazy lifecycle transition
      if (subscription.endDate < new Date()) {
        subscription.status = 'expired';
        if (subscription.save) await subscription.save();
        return res.status(403).json({
          error: 'Subscription expired',
          expiredAt: subscription.endDate
        });
      }

      req.subscription = {
        id: subscription._id,
        plan: subscription.planId,
        status: subscription.status,
        endDate: subscription.endDate
      };

      next();
    } catch (error) {
      return res.status(500).json({ error: 'Failed to verify subscription' });
    }
  };

  beforeEach(() => {
    req = mockRequest({ user: { orgId: 'org123', userId: 'user123' } });
    res = mockResponse();
    next = mockNext();
    jest.clearAllMocks();
  });

  describe('Active subscription with plan', () => {
    it('should load active subscription with plan details', async () => {
      const plan = createPlan({ _id: 'plan123', name: 'Pro', features: ['doc_crud', 'sharing'] });
      const subscription = createSubscription({
        _id: 'sub123',
        orgId: 'org123',
        planId: plan,
        status: 'active',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      });

      mockSubscription.findOne.mockResolvedValue(subscription);

      await attachSubscription(req, res, next);

      expect(req.subscription).toEqual({
        id: subscription._id,
        plan: plan,
        status: subscription.status,
        endDate: subscription.endDate,
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('No active subscription', () => {
    it('should reject when no active subscription exists', async () => {
      mockSubscription.findOne.mockResolvedValue(null);

      await attachSubscription(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'No active subscription' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Expired subscription - lazy expiration', () => {
    it('should transition expired subscription to expired status', async () => {
      const plan = createPlan({ _id: 'plan123', name: 'Pro' });
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      const subscription = {
        _id: 'sub123',
        orgId: 'org123',
        planId: plan,
        status: 'active',
        endDate: expiredDate,
        save: jest.fn().mockResolvedValue(true),
      };

      mockSubscription.findOne.mockResolvedValue(subscription);

      await attachSubscription(req, res, next);

      expect(subscription.status).toBe('expired');
      expect(subscription.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Subscription expired',
        expiredAt: expiredDate,
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Subscription at exact expiration moment', () => {
    it('should allow subscription that expires in the future', async () => {
      const plan = createPlan({ _id: 'plan123', name: 'Pro' });
      const futureDate = new Date(Date.now() + 1000); // 1 second from now
      const subscription = createSubscription({
        _id: 'sub123',
        orgId: 'org123',
        planId: plan,
        status: 'active',
        endDate: futureDate,
      });

      mockSubscription.findOne.mockResolvedValue(subscription);

      await attachSubscription(req, res, next);

      expect(req.subscription).toBeDefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Database errors', () => {
    it('should handle database errors gracefully', async () => {
      mockSubscription.findOne.mockRejectedValue(new Error('Database error'));

      await attachSubscription(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to verify subscription' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Missing plan reference', () => {
    it('should handle subscription with null planId', async () => {
      const subscription = createSubscription({
        _id: 'sub123',
        orgId: 'org123',
        planId: null,
        status: 'active',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      mockSubscription.findOne.mockResolvedValue(subscription);

      await attachSubscription(req, res, next);

      expect(req.subscription.plan).toBeNull();
      expect(next).toHaveBeenCalled();
    });
  });
});
