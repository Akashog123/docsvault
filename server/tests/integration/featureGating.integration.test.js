import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Plan from '../../src/models/Plan.js';
import Subscription from '../../src/models/Subscription.js';

describe('Feature Gating Integration Tests (BUSINESS CRITICAL)', () => {
  let freePlan, proPlan, enterprisePlan;
  let freeUserToken, proUserToken, enterpriseUserToken;

  beforeEach(async () => {
    // Create plans (beforeEach because global afterEach clears collections)
    freePlan = await Plan.create({
      name: 'Free',
      features: ['doc_crud'],
      limits: {
        maxDocuments: 10,
        maxStorage: 100,
      },
      price: 0,
      isActive: true,
    });

    proPlan = await Plan.create({
      name: 'Pro',
      features: ['doc_crud', 'sharing', 'versioning'],
      limits: {
        maxDocuments: 200,
        maxStorage: 1000,
      },
      price: 29.99,
      isActive: true,
    });

    enterprisePlan = await Plan.create({
      name: 'Enterprise',
      features: ['doc_crud', 'sharing', 'versioning', 'advanced_search'],
      limits: {
        maxDocuments: -1,
        maxStorage: -1,
      },
      price: 99.99,
      isActive: true,
    });

    // Register Free user
    const freeResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Free User',
        email: `free${Date.now()}@test.com`,
        password: 'password123',
        organizationName: `FreeOrg${Date.now()}`
      });
    freeUserToken = freeResponse.body.token;

    // Register Pro user
    const proResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Pro User',
        email: `pro${Date.now()}@test.com`,
        password: 'password123',
        organizationName: `ProOrg${Date.now()}`
      });
    proUserToken = proResponse.body.token;

    // Upgrade Pro user to Pro plan
    await request(app)
      .post('/api/subscription/change')
      .set('Authorization', `Bearer ${proUserToken}`)
      .send({ planId: proPlan._id });

    // Register Enterprise user
    const entResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Enterprise User',
        email: `ent${Date.now()}@test.com`,
        password: 'password123',
        organizationName: `EntOrg${Date.now()}`
      });
    enterpriseUserToken = entResponse.body.token;

    // Upgrade Enterprise user to Enterprise plan
    await request(app)
      .post('/api/subscription/change')
      .set('Authorization', `Bearer ${enterpriseUserToken}`)
      .send({ planId: enterprisePlan._id });
  });

  describe('Free plan limitations', () => {
    it('should have doc_crud feature', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${freeUserToken}`);

      expect(response.body.subscription.plan.features).toContain('doc_crud');
    });

    it('should NOT have sharing feature', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${freeUserToken}`);

      expect(response.body.subscription.plan.features).not.toContain('sharing');
    });

    it('should NOT have versioning feature', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${freeUserToken}`);

      expect(response.body.subscription.plan.features).not.toContain('versioning');
    });

    it('should NOT have advanced_search feature', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${freeUserToken}`);

      expect(response.body.subscription.plan.features).not.toContain('advanced_search');
    });
  });

  describe('Pro plan features', () => {
    it('should have doc_crud, sharing, versioning', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${proUserToken}`);

      expect(response.body.subscription.plan.features).toContain('doc_crud');
      expect(response.body.subscription.plan.features).toContain('sharing');
      expect(response.body.subscription.plan.features).toContain('versioning');
    });

    it('should NOT have advanced_search', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${proUserToken}`);

      expect(response.body.subscription.plan.features).not.toContain('advanced_search');
    });
  });

  describe('Enterprise plan features', () => {
    it('should have all features', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${enterpriseUserToken}`);

      expect(response.body.subscription.plan.features).toContain('doc_crud');
      expect(response.body.subscription.plan.features).toContain('sharing');
      expect(response.body.subscription.plan.features).toContain('versioning');
      expect(response.body.subscription.plan.features).toContain('advanced_search');
    });
  });

  describe('Plan limits', () => {
    it('should show Free plan limit of 10 documents', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${freeUserToken}`);

      expect(response.body.subscription.plan.limits.maxDocuments).toBe(10);
    });

    it('should show Pro plan limit of 200 documents', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${proUserToken}`);

      expect(response.body.subscription.plan.limits.maxDocuments).toBe(200);
    });

    it('should show Enterprise plan as unlimited (-1)', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${enterpriseUserToken}`);

      expect(response.body.subscription.plan.limits.maxDocuments).toBe(-1);
    });
  });
});
