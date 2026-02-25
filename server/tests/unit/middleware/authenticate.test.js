import { jest } from '@jest/globals';
import { generateToken, generateExpiredToken, generateInvalidToken, mockRequest, mockResponse, mockNext } from '../../setup/helpers.js';
import { createUser } from '../../setup/fixtures.js';

// Create a mock User object
const mockUser = {
  findById: jest.fn(),
};

// Mock authenticate middleware with injected dependency
const createAuthenticateMiddleware = (UserModel) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const token = authHeader.split(' ')[1];
      const jwt = await import('jsonwebtoken');
      const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'test-secret-key');

      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      req.user = {
        userId: user._id,
        orgId: user.orgId,
        role: user.role,
        name: user.name,
        email: user.email
      };

      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
};

describe('authenticate middleware', () => {
  let req, res, next, authenticate;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    jest.clearAllMocks();
    authenticate = createAuthenticateMiddleware(mockUser);
  });

  describe('Valid authentication', () => {
    it('should authenticate valid JWT token and attach user data', async () => {
      const userData = await createUser({ _id: 'user123', orgId: 'org123' });
      const token = generateToken('user123');

      req.headers.authorization = `Bearer ${token}`;
      mockUser.findById.mockResolvedValue(userData);

      await authenticate(req, res, next);

      expect(mockUser.findById).toHaveBeenCalledWith('user123');
      expect(req.user).toEqual({
        userId: userData._id,
        orgId: userData.orgId,
        role: userData.role,
        name: userData.name,
        email: userData.email,
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Missing or malformed Authorization header', () => {
    it('should reject request with no Authorization header', async () => {
      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with malformed Authorization header (no Bearer)', async () => {
      req.headers.authorization = 'InvalidToken';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with empty Bearer token', async () => {
      req.headers.authorization = 'Bearer ';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Expired token', () => {
    it('should reject expired JWT token', async () => {
      const token = generateExpiredToken('user123');
      req.headers.authorization = `Bearer ${token}`;

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Invalid signature', () => {
    it('should reject token with invalid signature', async () => {
      const token = generateInvalidToken();
      req.headers.authorization = `Bearer ${token}`;

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('User not found', () => {
    it('should reject when user no longer exists after token was issued', async () => {
      const token = generateToken('user123');
      req.headers.authorization = `Bearer ${token}`;
      mockUser.findById.mockResolvedValue(null);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Database errors', () => {
    it('should handle database errors gracefully', async () => {
      const token = generateToken('user123');
      req.headers.authorization = `Bearer ${token}`;
      mockUser.findById.mockRejectedValue(new Error('Database error'));

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
