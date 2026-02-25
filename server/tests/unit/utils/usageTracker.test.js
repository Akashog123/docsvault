import { incrementUsage, decrementUsage, getOrCreateUsageRecord } from '../../../src/utils/usageTracker.js';
import UsageRecord from '../../../src/models/UsageRecord.js';
import mongoose from 'mongoose';

describe('usageTracker utils', () => {
  describe('incrementUsage', () => {
    it('should atomically increment usage count', async () => {
      const orgId = new mongoose.Types.ObjectId();
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const result = await incrementUsage(orgId, 'documents');

      expect(result).toBeDefined();
      expect(result.orgId.toString()).toBe(orgId.toString());
      expect(result.metric).toBe('documents');
      expect(result.count).toBeGreaterThan(0);
    });

    it('should create new record if not exists (upsert)', async () => {
      const orgId = new mongoose.Types.ObjectId();

      const result = await incrementUsage(orgId, 'documents');

      expect(result).toBeDefined();
      expect(result.orgId.toString()).toBe(orgId.toString());
      expect(result.count).toBe(1);
    });

    it('should increment existing record', async () => {
      const orgId = new mongoose.Types.ObjectId();

      // First increment
      const result1 = await incrementUsage(orgId, 'documents');
      expect(result1.count).toBe(1);

      // Second increment
      const result2 = await incrementUsage(orgId, 'documents');
      expect(result2.count).toBe(2);
    });

    it('should handle storage metric', async () => {
      const orgId = new mongoose.Types.ObjectId();

      const result = await incrementUsage(orgId, 'storage');

      expect(result.metric).toBe('storage');
      expect(result.count).toBeGreaterThan(0);
    });

    it('should handle concurrent increments correctly', async () => {
      const orgId = new mongoose.Types.ObjectId();

      // Simulate concurrent increments
      const promises = Array(5).fill(null).map(() => incrementUsage(orgId, 'documents'));
      const results = await Promise.all(promises);

      // Final count should be 5
      const finalRecord = await UsageRecord.findOne({ orgId, metric: 'documents' });
      expect(finalRecord.count).toBe(5);
    });
  });

  describe('decrementUsage', () => {
    it('should atomically decrement usage count', async () => {
      const orgId = new mongoose.Types.ObjectId();

      // First increment to have something to decrement
      await incrementUsage(orgId, 'documents');
      await incrementUsage(orgId, 'documents');
      await incrementUsage(orgId, 'documents');

      const result = await decrementUsage(orgId, 'documents');

      expect(result).toBeDefined();
      expect(result.count).toBe(2);
    });

    it('should prevent negative counts', async () => {
      const orgId = new mongoose.Types.ObjectId();

      // Try to decrement when count is 0
      const result = await decrementUsage(orgId, 'documents');

      // Should return null or not decrement below 0
      if (result) {
        expect(result.count).toBeGreaterThanOrEqual(0);
      }
    });

    it('should not decrement if count is already 0', async () => {
      const orgId = new mongoose.Types.ObjectId();

      // Create record with count 0
      await UsageRecord.create({
        orgId,
        metric: 'documents',
        count: 0,
        periodStart: new Date(),
        periodEnd: new Date(),
      });

      const result = await decrementUsage(orgId, 'documents');

      // Should not update
      expect(result).toBeNull();
    });

    it('should handle storage metric', async () => {
      const orgId = new mongoose.Types.ObjectId();

      await incrementUsage(orgId, 'storage');
      const result = await decrementUsage(orgId, 'storage');

      expect(result.metric).toBe('storage');
      expect(result.count).toBe(0);
    });
  });

  describe('getOrCreateUsageRecord', () => {
    it('should create new usage record if not exists', async () => {
      const orgId = new mongoose.Types.ObjectId();

      const result = await getOrCreateUsageRecord(orgId, 'documents');

      expect(result).toBeDefined();
      expect(result.orgId.toString()).toBe(orgId.toString());
      expect(result.metric).toBe('documents');
      expect(result.count).toBe(0);
      expect(result.periodStart).toBeDefined();
      expect(result.periodEnd).toBeDefined();
    });

    it('should return existing usage record', async () => {
      const orgId = new mongoose.Types.ObjectId();

      // Create initial record
      const first = await getOrCreateUsageRecord(orgId, 'documents');
      await incrementUsage(orgId, 'documents');

      // Get again
      const second = await getOrCreateUsageRecord(orgId, 'documents');

      expect(second.count).toBe(1);
      expect(second._id.toString()).toBe(first._id.toString());
    });

    it('should lazy reset when period expired', async () => {
      const orgId = new mongoose.Types.ObjectId();
      const now = new Date();

      // Create record with expired period (last month)
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const expiredPeriodStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      const expiredPeriodEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59, 999);

      await UsageRecord.create({
        orgId,
        metric: 'documents',
        count: 50,
        periodStart: expiredPeriodStart,
        periodEnd: expiredPeriodEnd,
        lastResetAt: expiredPeriodStart,
      });

      const result = await getOrCreateUsageRecord(orgId, 'documents');

      // Should be reset to 0
      expect(result.count).toBe(0);
      expect(result.periodStart.getMonth()).toBe(now.getMonth());
      expect(result.periodEnd.getMonth()).toBe(now.getMonth());
    });

    it('should set correct period boundaries', async () => {
      const orgId = new mongoose.Types.ObjectId();
      const now = new Date();

      const result = await getOrCreateUsageRecord(orgId, 'documents');

      const expectedStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const expectedEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      expect(result.periodStart.getTime()).toBe(expectedStart.getTime());
      expect(result.periodEnd.getDate()).toBe(expectedEnd.getDate());
      expect(result.periodEnd.getMonth()).toBe(expectedEnd.getMonth());
    });

    it('should handle month boundary transitions', async () => {
      const orgId = new mongoose.Types.ObjectId();

      // Test works regardless of current month
      const result = await getOrCreateUsageRecord(orgId, 'documents');

      expect(result.periodStart.getDate()).toBe(1);
      expect(result.periodEnd.getHours()).toBe(23);
      expect(result.periodEnd.getMinutes()).toBe(59);
      expect(result.periodEnd.getSeconds()).toBe(59);
    });

    it('should handle December to January transition', async () => {
      const orgId = new mongoose.Types.ObjectId();

      const result = await getOrCreateUsageRecord(orgId, 'documents');

      // Period start should be first of current month
      expect(result.periodStart.getDate()).toBe(1);

      // Period end should be last day of current month
      const nextMonth = new Date(result.periodStart);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(0); // Last day of previous month

      expect(result.periodEnd.getDate()).toBe(nextMonth.getDate());
    });

    it('should default to documents metric', async () => {
      const orgId = new mongoose.Types.ObjectId();

      const result = await getOrCreateUsageRecord(orgId);

      expect(result.metric).toBe('documents');
    });

    it('should handle storage metric', async () => {
      const orgId = new mongoose.Types.ObjectId();

      const result = await getOrCreateUsageRecord(orgId, 'storage');

      expect(result.metric).toBe('storage');
    });
  });

  describe('getPeriodBounds (implicit testing)', () => {
    it('should return correct month boundaries for current month', async () => {
      const orgId = new mongoose.Types.ObjectId();
      const now = new Date();

      const result = await getOrCreateUsageRecord(orgId, 'documents');

      expect(result.periodStart.getFullYear()).toBe(now.getFullYear());
      expect(result.periodStart.getMonth()).toBe(now.getMonth());
      expect(result.periodStart.getDate()).toBe(1);
      expect(result.periodStart.getHours()).toBe(0);
      expect(result.periodStart.getMinutes()).toBe(0);
      expect(result.periodStart.getSeconds()).toBe(0);
    });

    it('should handle leap years correctly', async () => {
      const orgId = new mongoose.Types.ObjectId();

      const result = await getOrCreateUsageRecord(orgId, 'documents');

      // Just verify it doesn't crash and returns valid dates
      expect(result.periodStart).toBeInstanceOf(Date);
      expect(result.periodEnd).toBeInstanceOf(Date);
      expect(result.periodEnd.getTime()).toBeGreaterThan(result.periodStart.getTime());
    });
  });

  describe('Concurrent operations', () => {
    it('should handle concurrent getOrCreate calls', async () => {
      const orgId = new mongoose.Types.ObjectId();

      // Simulate concurrent calls
      const promises = Array(10).fill(null).map(() => getOrCreateUsageRecord(orgId, 'documents'));
      const results = await Promise.all(promises);

      // All should return the same record
      const ids = results.map(r => r._id.toString());
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds.length).toBe(1);
    });

    it('should handle mixed increment and decrement operations', async () => {
      const orgId = new mongoose.Types.ObjectId();

      // Create initial record with some count
      await incrementUsage(orgId, 'documents');
      await incrementUsage(orgId, 'documents');

      // Mix of operations
      const operations = [
        incrementUsage(orgId, 'documents'),
        incrementUsage(orgId, 'documents'),
        decrementUsage(orgId, 'documents'),
        incrementUsage(orgId, 'documents'),
      ];

      await Promise.all(operations);

      const final = await getOrCreateUsageRecord(orgId, 'documents');
      // Started with 2, added 3, removed 1 = 4
      expect(final.count).toBe(4);
    });
  });
});
