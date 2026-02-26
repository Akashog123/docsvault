import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Organization from '../../src/models/Organization.js';
import '../setup/testDb.js'; // Let the setup file handle the DB lifecycle
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import mongoose from 'mongoose';

describe('Admin API Integration Tests', () => {
  let superAdminToken;
  let adminToken;
  let superAdmin;
  let orgAdmin;
  let org1;
  let org2;

  beforeEach(async () => {
    // 1. Create a super admin user
    superAdmin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@docsvault.com',
      password: 'password123',
      role: 'super_admin'
    });

    superAdminToken = jwt.sign(
      { userId: superAdmin._id },
      process.env.JWT_SECRET || 'testsecret',
      { expiresIn: '1h' }
    );

    // 2. Create organizations and normal users
    const orgId1 = new mongoose.Types.ObjectId();
    const orgId2 = new mongoose.Types.ObjectId();

    orgAdmin = await User.create({
      name: 'Org 1 Admin',
      email: 'admin@org1.com',
      password: 'password123',
      role: 'admin',
      orgId: orgId1
    });

    adminToken = jwt.sign(
      { userId: orgAdmin._id },
      process.env.JWT_SECRET || 'testsecret',
      { expiresIn: '1h' }
    );

    org1 = await Organization.create({
      _id: orgId1,
      name: 'Acme Corp',
      slug: 'acme',
      adminId: orgAdmin._id
    });

    await User.create({
      name: 'Member 1',
      email: 'member1@org1.com',
      password: 'password123',
      role: 'member',
      orgId: org1._id
    });

    const org2Admin = await User.create({
      name: 'Org 2 Admin',
      email: 'admin@org2.com',
      password: 'password123',
      role: 'admin',
      orgId: orgId2
    });

    org2 = await Organization.create({
      _id: orgId2,
      name: 'Globex',
      slug: 'globex',
      adminId: org2Admin._id
    });
  });

  describe('GET /api/admin/organizations', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/admin/organizations');
      expect(res.status).toBe(401);
    });

    it('should return 403 if authenticated but not super_admin', async () => {
      const res = await request(app)
        .get('/api/admin/organizations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });

    it('should return a paginated list of organizations for super_admin', async () => {
      const res = await request(app)
        .get('/api/admin/organizations')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('organizations');
      expect(res.body.organizations).toHaveLength(2); // We created 2 orgs

      // Verify pagination metadata
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination).toMatchObject({
        limit: 10,
        offset: 0,
        total: 2
      });

      // Verify the org data structure
      const fetchedOrg1 = res.body.organizations.find(o => o.slug === 'acme');
      expect(fetchedOrg1).toBeDefined();
      expect(fetchedOrg1.name).toBe('Acme Corp');

      // Verify admin is populated
      expect(fetchedOrg1.admin).toBeDefined();
      expect(fetchedOrg1.admin.email).toBe('admin@org1.com');

      // Verify members are populated
      expect(fetchedOrg1.members).toHaveLength(1);
      expect(fetchedOrg1.members[0].email).toBe('member1@org1.com');
    });

    it('should respect limit and offset parameters', async () => {
      // Create more orgs to test pagination
      for (let i = 3; i <= 6; i++) {
        const orgId = new mongoose.Types.ObjectId();

        const admin = await User.create({
            name: `Org ${i} Admin`,
            email: `admin${i}@org${i}.com`,
            password: 'password123',
            role: 'admin',
            orgId: orgId
        });

        const org = await Organization.create({
            _id: orgId,
            name: `Test Org ${i}`,
            slug: `test-org-${i}`,
            adminId: admin._id
        });
      }

      // Total orgs: 2 (from beforeEach) + 4 (from here) = 6
      const limit = 2;
      const offset = 1;

      const res = await request(app)
        .get(`/api/admin/organizations?limit=${limit}&offset=${offset}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.organizations).toHaveLength(limit);
      expect(res.body.pagination).toMatchObject({
        limit: 2,
        offset: 1,
        total: 6
      });
    });
  });
});
