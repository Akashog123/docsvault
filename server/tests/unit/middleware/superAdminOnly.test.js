import { jest } from '@jest/globals';
import superAdminOnly from '../../../src/middleware/superAdminOnly.js';
import { mockRequest, mockResponse, mockNext } from '../../setup/helpers.js';

describe('superAdminOnly middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    jest.clearAllMocks();
  });

  describe('Super admin role', () => {
    it('should allow access for super_admin role', () => {
      req.user = { role: 'super_admin', userId: 'user123', orgId: 'org123' };

      superAdminOnly(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Non-super-admin roles', () => {
    it('should block access for admin role', () => {
      req.user = { role: 'admin', userId: 'user123', orgId: 'org123' };

      superAdminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Super admin access required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should block access for member role', () => {
      req.user = { role: 'member', userId: 'user123', orgId: 'org123' };

      superAdminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should block access for undefined role', () => {
      req.user = { userId: 'user123', orgId: 'org123' };

      superAdminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
