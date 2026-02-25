import { jest } from '@jest/globals';
import checkFeature from '../../../src/middleware/checkFeature.js';
import { mockRequest, mockResponse, mockNext } from '../../setup/helpers.js';
import { createPlan } from '../../setup/fixtures.js';

describe('checkFeature middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    jest.clearAllMocks();
  });

  describe('Feature available in plan', () => {
    it('should allow access when feature is in plan', () => {
      const plan = createPlan({ name: 'Pro', features: ['doc_crud', 'sharing', 'versioning'] });
      req.subscription = { plan };

      const middleware = checkFeature('sharing');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow doc_crud feature for Free plan', () => {
      const plan = createPlan({ name: 'Free', features: ['doc_crud'] });
      req.subscription = { plan };

      const middleware = checkFeature('doc_crud');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow all features for Enterprise plan', () => {
      const plan = createPlan({
        name: 'Enterprise',
        features: ['doc_crud', 'sharing', 'versioning', 'advanced_search'],
      });
      req.subscription = { plan };

      const features = ['doc_crud', 'sharing', 'versioning', 'advanced_search'];
      features.forEach((feature) => {
        const middleware = checkFeature(feature);
        middleware(req, res, next);
        expect(next).toHaveBeenCalled();
      });
    });
  });

  describe('Feature not available in plan', () => {
    it('should block access when feature is missing from plan', () => {
      const plan = createPlan({ name: 'Free', features: ['doc_crud'] });
      req.subscription = { plan };

      const middleware = checkFeature('sharing');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Feature 'sharing' is not available in your Free plan",
        currentPlan: 'Free',
        requiredFeature: 'sharing',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should block versioning for Free plan', () => {
      const plan = createPlan({ name: 'Free', features: ['doc_crud'] });
      req.subscription = { plan };

      const middleware = checkFeature('versioning');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Feature 'versioning' is not available in your Free plan",
        currentPlan: 'Free',
        requiredFeature: 'versioning',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should block advanced_search for Pro plan', () => {
      const plan = createPlan({ name: 'Pro', features: ['doc_crud', 'sharing', 'versioning'] });
      req.subscription = { plan };

      const middleware = checkFeature('advanced_search');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Feature 'advanced_search' is not available in your Pro plan",
        currentPlan: 'Pro',
        requiredFeature: 'advanced_search',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Error response format', () => {
    it('should return correct error message with plan details', () => {
      const plan = createPlan({ name: 'Starter', features: ['doc_crud'] });
      req.subscription = { plan };

      const middleware = checkFeature('sharing');
      middleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('sharing'),
          error: expect.stringContaining('Starter'),
          currentPlan: 'Starter',
          requiredFeature: 'sharing',
        })
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty features array', () => {
      const plan = createPlan({ name: 'Empty', features: [] });
      req.subscription = { plan };

      const middleware = checkFeature('doc_crud');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle case-sensitive feature names', () => {
      const plan = createPlan({ name: 'Pro', features: ['doc_crud'] });
      req.subscription = { plan };

      const middleware = checkFeature('DOC_CRUD');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Multiple feature checks', () => {
    it('should work correctly when called multiple times', () => {
      const plan = createPlan({ name: 'Pro', features: ['doc_crud', 'sharing'] });
      req.subscription = { plan };

      // First check - should pass
      const middleware1 = checkFeature('doc_crud');
      middleware1(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Second check - should pass
      const middleware2 = checkFeature('sharing');
      middleware2(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);

      // Third check - should fail
      const middleware3 = checkFeature('versioning');
      middleware3(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).toHaveBeenCalledTimes(2); // Still 2, not called again
    });
  });
});
