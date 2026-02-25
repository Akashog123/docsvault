import Subscription from '../../../src/models/Subscription.js';

describe('Subscription model', () => {
  describe('Schema validation', () => {
    it('should create subscription with valid data', async () => {
      const subscriptionData = {
        orgId: '507f1f77bcf86cd799439011',
        planId: '507f1f77bcf86cd799439012',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const subscription = new Subscription(subscriptionData);
      await subscription.save();

      expect(subscription.orgId.toString()).toBe(subscriptionData.orgId);
      expect(subscription.planId.toString()).toBe(subscriptionData.planId);
      expect(subscription.status).toBe(subscriptionData.status);
      expect(subscription.startDate).toBeInstanceOf(Date);
      expect(subscription.endDate).toBeInstanceOf(Date);
    });

    it('should require orgId field', async () => {
      const subscriptionData = {
        planId: '507f1f77bcf86cd799439012',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const subscription = new Subscription(subscriptionData);

      await expect(subscription.save()).rejects.toThrow();
    });

    it('should require planId field', async () => {
      const subscriptionData = {
        orgId: '507f1f77bcf86cd799439011',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const subscription = new Subscription(subscriptionData);

      await expect(subscription.save()).rejects.toThrow();
    });

    it('should require endDate field', async () => {
      const subscriptionData = {
        orgId: '507f1f77bcf86cd799439011',
        planId: '507f1f77bcf86cd799439012',
        status: 'active',
        startDate: new Date(),
      };

      const subscription = new Subscription(subscriptionData);

      await expect(subscription.save()).rejects.toThrow();
    });

    it('should default status to active', async () => {
      const subscriptionData = {
        orgId: '507f1f77bcf86cd799439011',
        planId: '507f1f77bcf86cd799439012',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const subscription = new Subscription(subscriptionData);
      await subscription.save();

      expect(subscription.status).toBe('active');
    });

    it('should default startDate to now', async () => {
      const before = new Date();

      const subscriptionData = {
        orgId: '507f1f77bcf86cd799439011',
        planId: '507f1f77bcf86cd799439012',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const subscription = new Subscription(subscriptionData);
      await subscription.save();

      const after = new Date();

      expect(subscription.startDate).toBeInstanceOf(Date);
      expect(subscription.startDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(subscription.startDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Status enum validation', () => {
    it('should accept active status', async () => {
      const subscriptionData = {
        orgId: '507f1f77bcf86cd799439011',
        planId: '507f1f77bcf86cd799439012',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const subscription = new Subscription(subscriptionData);
      await subscription.save();

      expect(subscription.status).toBe('active');
    });

    it('should accept expired status', async () => {
      const subscriptionData = {
        orgId: '507f1f77bcf86cd799439011',
        planId: '507f1f77bcf86cd799439012',
        status: 'expired',
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      };

      const subscription = new Subscription(subscriptionData);
      await subscription.save();

      expect(subscription.status).toBe('expired');
    });

    it('should reject invalid status', async () => {
      const subscriptionData = {
        orgId: '507f1f77bcf86cd799439011',
        planId: '507f1f77bcf86cd799439012',
        status: 'cancelled',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const subscription = new Subscription(subscriptionData);

      await expect(subscription.save()).rejects.toThrow();
    });

    it('should reject pending status', async () => {
      const subscriptionData = {
        orgId: '507f1f77bcf86cd799439011',
        planId: '507f1f77bcf86cd799439012',
        status: 'pending',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const subscription = new Subscription(subscriptionData);

      await expect(subscription.save()).rejects.toThrow();
    });
  });

  describe('Date field validation', () => {
    it('should accept valid date objects', async () => {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const subscriptionData = {
        orgId: '507f1f77bcf86cd799439011',
        planId: '507f1f77bcf86cd799439012',
        startDate,
        endDate,
      };

      const subscription = new Subscription(subscriptionData);
      await subscription.save();

      expect(subscription.startDate).toEqual(startDate);
      expect(subscription.endDate).toEqual(endDate);
    });

    it('should accept date strings and convert to Date', async () => {
      const subscriptionData = {
        orgId: '507f1f77bcf86cd799439011',
        planId: '507f1f77bcf86cd799439012',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const subscription = new Subscription(subscriptionData);
      await subscription.save();

      expect(subscription.startDate).toBeInstanceOf(Date);
      expect(subscription.endDate).toBeInstanceOf(Date);
    });

    it('should allow endDate before startDate (no validation)', async () => {
      const subscriptionData = {
        orgId: '507f1f77bcf86cd799439011',
        planId: '507f1f77bcf86cd799439012',
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01'),
      };

      const subscription = new Subscription(subscriptionData);
      await subscription.save();

      expect(subscription.endDate.getTime()).toBeLessThan(subscription.startDate.getTime());
    });
  });

  describe('Index on orgId and status', () => {
    it('should have compound index on orgId and status', async () => {
      const indexes = await Subscription.collection.getIndexes();

      const hasCompoundIndex = Object.keys(indexes).some(key =>
        key.includes('orgId') && key.includes('status')
      );

      expect(hasCompoundIndex).toBe(true);
    });

    it('should efficiently query by orgId and status', async () => {
      const orgId = '507f1f77bcf86cd799439011';

      // Create multiple subscriptions
      await Subscription.create({
        orgId,
        planId: '507f1f77bcf86cd799439012',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      await Subscription.create({
        orgId,
        planId: '507f1f77bcf86cd799439013',
        status: 'expired',
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      });

      const activeSubscriptions = await Subscription.find({ orgId, status: 'active' });

      expect(activeSubscriptions).toHaveLength(1);
      expect(activeSubscriptions[0].status).toBe('active');
    });
  });

  describe('Timestamps', () => {
    it('should add createdAt timestamp', async () => {
      const subscriptionData = {
        orgId: '507f1f77bcf86cd799439011',
        planId: '507f1f77bcf86cd799439012',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const subscription = new Subscription(subscriptionData);
      await subscription.save();

      expect(subscription.createdAt).toBeDefined();
      expect(subscription.createdAt).toBeInstanceOf(Date);
    });

    it('should add updatedAt timestamp', async () => {
      const subscriptionData = {
        orgId: '507f1f77bcf86cd799439011',
        planId: '507f1f77bcf86cd799439012',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const subscription = new Subscription(subscriptionData);
      await subscription.save();

      expect(subscription.updatedAt).toBeDefined();
      expect(subscription.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on modification', async () => {
      const subscriptionData = {
        orgId: '507f1f77bcf86cd799439011',
        planId: '507f1f77bcf86cd799439012',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const subscription = new Subscription(subscriptionData);
      await subscription.save();

      const originalUpdatedAt = subscription.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      subscription.status = 'expired';
      await subscription.save();

      expect(subscription.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Multiple subscriptions per organization', () => {
    it('should allow multiple subscriptions for same org', async () => {
      const orgId = '507f1f77bcf86cd799439011';

      const sub1 = await Subscription.create({
        orgId,
        planId: '507f1f77bcf86cd799439012',
        status: 'expired',
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      });

      const sub2 = await Subscription.create({
        orgId,
        planId: '507f1f77bcf86cd799439013',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const subscriptions = await Subscription.find({ orgId });

      expect(subscriptions).toHaveLength(2);
    });
  });
});
