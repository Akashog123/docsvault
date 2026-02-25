import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

export const generateExpiredToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '-1h' });
};

export const generateInvalidToken = () => {
  return jwt.sign({ userId: 'test' }, 'wrong-secret', { expiresIn: '7d' });
};

export const mockRequest = (overrides = {}) => {
  return {
    headers: {},
    body: {},
    params: {},
    query: {},
    user: null,
    subscription: null,
    usage: null,
    ...overrides,
  };
};

export const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

export const mockNext = () => jest.fn();
