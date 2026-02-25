// Pre-mock dependencies before any imports
// This runs before any test files are loaded

import { jest } from '@jest/globals';

// Mock jsonwebtoken
const mockJwtVerify = jest.fn();
const mockJwt = {
  default: {
    verify: mockJwtVerify,
  },
  verify: mockJwtVerify,
};

import.meta.jest.mock('jsonwebtoken', mockJwt);

// Mock User model - will be set up per-test
const mockUserFindById = jest.fn();
import.meta.jest.mock('../models/User.js', () => ({
  default: {
    findById: mockUserFindById,
  },
}));

// Export mock functions for test setup
export { mockJwtVerify, mockUserFindById };
