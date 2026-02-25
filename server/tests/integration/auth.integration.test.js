import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Organization from '../../src/models/Organization.js';
import Subscription from '../../src/models/Subscription.js';
import Plan from '../../src/models/Plan.js';

// Integration tests - keeping basic structure for future development
// Currently tests run but may have timing issues with in-memory MongoDB

describe('Auth Integration Tests', () => {
  let freePlan;

  beforeEach(async () => {
    // Create Free plan for registration (beforeEach because global afterEach clears collections)
    freePlan = await Plan.create({
      name: 'Free',
      features: ['doc_crud'],
      limits: {
        maxDocuments: 10,
        maxStorage: 100,
      },
      price: 0,
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register new user with org and subscription', async () => {
      const uniqueId = Date.now();
      const userData = {
        name: 'Test User',
        email: `test${uniqueId}@example.com`,
        password: 'password123',
        organizationName: `Test Org ${uniqueId}`,
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);

      // Verify user was created
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeDefined();
      expect(user.role).toBe('admin');

      // Verify organization was created
      const org = await Organization.findById(user.orgId);
      expect(org).toBeDefined();
      expect(org.name).toBe(userData.organizationName);

      // Verify subscription was created
      const subscription = await Subscription.findOne({ orgId: user.orgId });
      expect(subscription).toBeDefined();
      expect(subscription.status).toBe('active');
      expect(subscription.planId.toString()).toBe(freePlan._id.toString());
    });

    it('should reject duplicate email', async () => {
      const uniqueId = Date.now();
      const userData = {
        name: 'User One',
        email: `dup${uniqueId}@example.com`,
        password: 'password123',
        organizationName: `Org One ${uniqueId}`,
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email (different org name to avoid slug collision)
      const userData2 = {
        ...userData,
        organizationName: `Org Two ${uniqueId}`
      };
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData2)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should require all fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'incomplete@example.com',
          // Missing password and organizationName
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should hash password', async () => {
      const uniqueId = Date.now();
      const userData = {
        name: 'Hash Test',
        email: `hash${uniqueId}@example.com`,
        password: 'plainpassword',
        organizationName: `Hash Org ${uniqueId}`,
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const user = await User.findOne({ email: userData.email }).select('+password');
      expect(user.password).not.toBe(userData.password);
      expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
    });
  });

  describe('POST /api/auth/login', () => {
    let loginUser;

    beforeEach(async () => {
      // Create a test user
      const uniqueId = Date.now();
      loginUser = {
        email: `login${uniqueId}@example.com`,
        password: 'password123',
        organizationName: `Login Org ${uniqueId}`,
        name: 'Login Test User'
      };
      await request(app)
        .post('/api/auth/register')
        .send(loginUser);
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: loginUser.email,
          password: loginUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(loginUser.email);
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: loginUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return valid JWT token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: loginUser.email,
          password: loginUser.password,
        })
        .expect(200);

      const token = response.body.token;
      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;

    beforeEach(async () => {
      // Register and login
      const uniqueId = Date.now();
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Me Test User',
          email: `me${uniqueId}@example.com`,
          password: 'password123',
          organizationName: `Me Org ${uniqueId}`,
        });

      authToken = registerResponse.body.token;
    });

    it('should return user data with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('organization');
      expect(response.body).toHaveProperty('subscription');
      expect(response.body).toHaveProperty('usage');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should include subscription details', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.subscription).toHaveProperty('plan');
      expect(response.body.subscription.plan).toHaveProperty('features');
      expect(response.body.subscription.plan).toHaveProperty('limits');
      expect(response.body.subscription.status).toBe('active');
    });

    it('should include usage information', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.usage).toHaveProperty('documents');
      expect(response.body.usage).toHaveProperty('storage');
      expect(response.body.usage.documents).toBeGreaterThanOrEqual(0);
      expect(response.body.usage.storage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Authentication flow', () => {
    it('should complete full registration and login flow', async () => {
      const uniqueId = Date.now();

      // Step 1: Register
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Flow Test',
          email: `flow${uniqueId}@example.com`,
          password: 'password123',
          organizationName: `Flow Org ${uniqueId}`,
        })
        .expect(201);

      const registerToken = registerResponse.body.token;
      expect(registerToken).toBeDefined();

      // Step 2: Use token to access protected route
      const meResponse1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${registerToken}`)
        .expect(200);

      expect(meResponse1.body.user.email).toBe(`flow${uniqueId}@example.com`);

      // Step 3: Login again
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: `flow${uniqueId}@example.com`,
          password: 'password123',
        })
        .expect(200);

      const loginToken = loginResponse.body.token;
      expect(loginToken).toBeDefined();

      // Step 4: Use new token
      const meResponse2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      expect(meResponse2.body.user.email).toBe(`flow${uniqueId}@example.com`);
    });
  });
});
