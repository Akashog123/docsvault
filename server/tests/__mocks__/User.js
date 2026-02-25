import { jest } from '@jest/globals';

// Mock User model
const mockUser = {
  findById: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
};

export default mockUser;
