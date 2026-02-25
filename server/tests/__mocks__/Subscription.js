import { jest } from '@jest/globals';

// Mock Subscription model
const mockSubscription = {
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
};

export default mockSubscription;
