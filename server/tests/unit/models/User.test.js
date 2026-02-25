import User from '../../../src/models/User.js';
import bcrypt from 'bcryptjs';

describe('User model', () => {
  describe('Schema validation', () => {
    it('should create user with valid data', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        orgId: '507f1f77bcf86cd799439011',
        role: 'admin',
      };

      const user = new User(userData);
      await user.save();

      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.orgId.toString()).toBe(userData.orgId);
      expect(user.role).toBe(userData.role);
    });

    it('should require name field', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        orgId: '507f1f77bcf86cd799439011',
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should require email field', async () => {
      const userData = {
        name: 'Test User',
        password: 'password123',
        orgId: '507f1f77bcf86cd799439011',
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should require password field', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        orgId: '507f1f77bcf86cd799439011',
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should require orgId field', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should enforce email uniqueness', async () => {
      const userData = {
        name: 'Test User',
        email: 'duplicate@example.com',
        password: 'password123',
        orgId: '507f1f77bcf86cd799439011',
      };

      const user1 = new User(userData);
      await user1.save();

      const user2 = new User(userData);
      await expect(user2.save()).rejects.toThrow();
    });

    it('should convert email to lowercase', async () => {
      const userData = {
        name: 'Test User',
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
        orgId: '507f1f77bcf86cd799439011',
      };

      const user = new User(userData);
      await user.save();

      expect(user.email).toBe('test@example.com');
    });

    it('should trim email whitespace', async () => {
      const userData = {
        name: 'Test User',
        email: '  test@example.com  ',
        password: 'password123',
        orgId: '507f1f77bcf86cd799439011',
      };

      const user = new User(userData);
      await user.save();

      expect(user.email).toBe('test@example.com');
    });

    it('should trim name whitespace', async () => {
      const userData = {
        name: '  Test User  ',
        email: 'test@example.com',
        password: 'password123',
        orgId: '507f1f77bcf86cd799439011',
      };

      const user = new User(userData);
      await user.save();

      expect(user.name).toBe('Test User');
    });

    it('should default role to member', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        orgId: '507f1f77bcf86cd799439011',
      };

      const user = new User(userData);
      await user.save();

      expect(user.role).toBe('member');
    });

    it('should validate role enum', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        orgId: '507f1f77bcf86cd799439011',
        role: 'invalid-role',
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should enforce minimum password length', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: '12345', // Only 5 characters
        orgId: '507f1f77bcf86cd799439011',
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('Password hashing (pre-save hook)', () => {
    it('should hash password on save', async () => {
      const plainPassword = 'password123';
      const userData = {
        name: 'Test User',
        email: 'hash-test@example.com',
        password: plainPassword,
        orgId: '507f1f77bcf86cd799439011',
      };

      const user = new User(userData);
      await user.save();

      // Fetch with password field
      const savedUser = await User.findById(user._id).select('+password');

      expect(savedUser.password).not.toBe(plainPassword);
      expect(savedUser.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
    });

    it('should not rehash password if not modified', async () => {
      const userData = {
        name: 'Test User',
        email: 'no-rehash@example.com',
        password: 'password123',
        orgId: '507f1f77bcf86cd799439011',
      };

      const user = new User(userData);
      await user.save();

      const savedUser = await User.findById(user._id).select('+password');
      const originalHash = savedUser.password;

      // Update name only
      savedUser.name = 'Updated Name';
      await savedUser.save();

      const updatedUser = await User.findById(user._id).select('+password');
      expect(updatedUser.password).toBe(originalHash);
    });

    it('should rehash password if modified', async () => {
      const userData = {
        name: 'Test User',
        email: 'rehash@example.com',
        password: 'password123',
        orgId: '507f1f77bcf86cd799439011',
      };

      const user = new User(userData);
      await user.save();

      const savedUser = await User.findById(user._id).select('+password');
      const originalHash = savedUser.password;

      // Update password
      savedUser.password = 'newpassword456';
      await savedUser.save();

      const updatedUser = await User.findById(user._id).select('+password');
      expect(updatedUser.password).not.toBe(originalHash);
    });
  });

  describe('comparePassword method', () => {
    it('should return true for correct password', async () => {
      const plainPassword = 'password123';
      const userData = {
        name: 'Test User',
        email: 'compare-test@example.com',
        password: plainPassword,
        orgId: '507f1f77bcf86cd799439011',
      };

      const user = new User(userData);
      await user.save();

      const savedUser = await User.findById(user._id).select('+password');
      const isMatch = await savedUser.comparePassword(plainPassword);

      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const plainPassword = 'password123';
      const userData = {
        name: 'Test User',
        email: 'compare-wrong@example.com',
        password: plainPassword,
        orgId: '507f1f77bcf86cd799439011',
      };

      const user = new User(userData);
      await user.save();

      const savedUser = await User.findById(user._id).select('+password');
      const isMatch = await savedUser.comparePassword('wrongpassword');

      expect(isMatch).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const plainPassword = 'Password123';
      const userData = {
        name: 'Test User',
        email: 'case-sensitive@example.com',
        password: plainPassword,
        orgId: '507f1f77bcf86cd799439011',
      };

      const user = new User(userData);
      await user.save();

      const savedUser = await User.findById(user._id).select('+password');
      const isMatch = await savedUser.comparePassword('password123');

      expect(isMatch).toBe(false);
    });
  });

  describe('Password field selection', () => {
    it('should not include password by default', async () => {
      const userData = {
        name: 'Test User',
        email: 'select-test@example.com',
        password: 'password123',
        orgId: '507f1f77bcf86cd799439011',
      };

      const user = new User(userData);
      await user.save();

      const foundUser = await User.findById(user._id);

      expect(foundUser.password).toBeUndefined();
    });

    it('should include password when explicitly selected', async () => {
      const userData = {
        name: 'Test User',
        email: 'select-explicit@example.com',
        password: 'password123',
        orgId: '507f1f77bcf86cd799439011',
      };

      const user = new User(userData);
      await user.save();

      const foundUser = await User.findById(user._id).select('+password');

      expect(foundUser.password).toBeDefined();
    });
  });

  describe('Indexes', () => {
    it('should have email index', async () => {
      const indexes = await User.collection.getIndexes();

      expect(indexes).toHaveProperty('email_1');
    });

    it('should have orgId index', async () => {
      const indexes = await User.collection.getIndexes();

      expect(indexes).toHaveProperty('orgId_1');
    });
  });

  describe('Timestamps', () => {
    it('should add createdAt timestamp', async () => {
      const userData = {
        name: 'Test User',
        email: 'timestamp@example.com',
        password: 'password123',
        orgId: '507f1f77bcf86cd799439011',
      };

      const user = new User(userData);
      await user.save();

      expect(user.createdAt).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should add updatedAt timestamp', async () => {
      const userData = {
        name: 'Test User',
        email: 'updated-timestamp@example.com',
        password: 'password123',
        orgId: '507f1f77bcf86cd799439011',
      };

      const user = new User(userData);
      await user.save();

      expect(user.updatedAt).toBeDefined();
      expect(user.updatedAt).toBeInstanceOf(Date);
    });
  });
});
