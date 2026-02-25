import { jest } from '@jest/globals';

// Mock jwt
const mockJwt = {
  verify: jest.fn(),
};

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: mockJwt,
  __esModule: true,
}));

// Mock User model
const mockUserFindById = jest.fn();

jest.unstable_mockModule('../models/User.js', () => ({
  default: {
    findById: mockUserFindById,
  },
  __esModule: true,
}));

// Export for use in tests
export { mockJwt, mockUserFindById };
