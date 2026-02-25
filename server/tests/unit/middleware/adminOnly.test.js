import { jest } from '@jest/globals';
import adminOnly from '../../../src/middleware/adminOnly.js';
import { mockRequest, mockResponse, mockNext } from '../../setup/helpers.js';

describe('adminOnly middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    jest.clearAllMocks();
  });

  describe('Admin role', () => {
    it('should allow access for admin role', () => {
      req.user = { role: 'admin', userId: 'user123', orgId: 'org123' };

      adminOnly(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block access for super_admin role (org admin only)', () => {
      req.user = { role: 'super_admin', userId: 'user123', orgId: 'org123' };

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access for admin with additional user properties', () => {
      req.user = {
        role: 'admin',
        userId: 'user123',
        orgId: 'org123',
        name: 'Admin User',
        email: 'admin@example.com',
      };

      adminOnly(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Member role', () => {
    it('should block access for member role', () => {
      req.user = { role: 'member', userId: 'user123', orgId: 'org123' };

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Organization admin access required' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Non-admin roles', () => {
    it('should block access for viewer role', () => {
      req.user = { role: 'viewer', userId: 'user123', orgId: 'org123' };

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Organization admin access required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should block access for editor role', () => {
      req.user = { role: 'editor', userId: 'user123', orgId: 'org123' };

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should block access for undefined role', () => {
      req.user = { userId: 'user123', orgId: 'org123' };

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should block access for null role', () => {
      req.user = { role: null, userId: 'user123', orgId: 'org123' };

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should block access for empty string role', () => {
      req.user = { role: '', userId: 'user123', orgId: 'org123' };

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Case sensitivity', () => {
    it('should block access for "Admin" with capital A', () => {
      req.user = { role: 'Admin', userId: 'user123', orgId: 'org123' };

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should block access for "ADMIN" in uppercase', () => {
      req.user = { role: 'ADMIN', userId: 'user123', orgId: 'org123' };

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Multiple calls', () => {
    it('should work correctly when called multiple times', () => {
      // First call with admin
      req.user = { role: 'admin' };
      adminOnly(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Second call with member
      req.user = { role: 'member' };
      adminOnly(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).toHaveBeenCalledTimes(1); // Still 1, not called again
    });
  });

  describe('Error response format', () => {
    it('should return correct error message', () => {
      req.user = { role: 'member' };

      adminOnly(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ error: 'Organization admin access required' });
    });

    it('should return 403 status code', () => {
      req.user = { role: 'member' };

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
