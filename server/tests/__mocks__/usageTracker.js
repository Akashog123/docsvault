import { jest } from '@jest/globals';

// Mock usageTracker functions
export const getOrCreateUsageRecord = jest.fn();
export const incrementUsage = jest.fn();
export const decrementUsage = jest.fn();
