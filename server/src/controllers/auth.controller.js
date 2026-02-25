import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Subscription from '../models/Subscription.js';
import Plan from '../models/Plan.js';
import { getOrCreateUsageRecord } from '../utils/usageTracker.js';

const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, orgId: user.orgId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

export const checkSetup = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    res.json({ needsSetup: userCount === 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const setupPlatform = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields: name, email, password are required' });
    }

    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return res.status(403).json({ error: 'Platform is already initialized. Use standard registration.' });
    }

    // Create super_admin without an organization
    const user = await User.create({
      name,
      email,
      password,
      role: 'super_admin'
      // Note: orgId is intentionally omitted as super_admin doesn't need one
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      organization: null
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const register = async (req, res) => {
  try {
    const { name, email, password, organizationName, orgName, inviteCode } = req.body;
    const org = organizationName || orgName;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields: name, email, password are required' });
    }

    if (!org && !inviteCode) {
      return res.status(400).json({ error: 'You must either provide an organizationName to create a new one, or an inviteCode to join an existing one' });
    }

    // Check if platform is initialized
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      return res.status(403).json({ error: 'Platform not initialized. Super admin must setup the platform first.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    let targetOrgId;
    let assignedRole;
    let finalOrg;

    if (inviteCode) {
      // JOIN EXISTING ORGANIZATION FLOW
      finalOrg = await Organization.findOne({ inviteCode: inviteCode.toUpperCase() });
      if (!finalOrg) {
        return res.status(400).json({ error: 'Invalid invite code' });
      }
      targetOrgId = finalOrg._id;
      assignedRole = 'member';

    } else {
      // CREATE NEW ORGANIZATION FLOW
      const slug = org.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existingOrg = await Organization.findOne({ slug });
      if (existingOrg) {
        return res.status(400).json({ error: 'Organization name already taken' });
      }

      finalOrg = await Organization.create({
        name: org,
        slug
      });
      targetOrgId = finalOrg._id;
      assignedRole = 'admin';

      // Assign default plan (lowest-price active plan)
      const defaultPlan = await Plan.findOne({ isActive: true }).sort({ price: 1 });
      if (!defaultPlan) {
        await Organization.findByIdAndDelete(finalOrg._id);
        return res.status(500).json({ error: 'No active subscription plans are configured. Please contact the platform administrator.' });
      }

      const endDate = new Date();
      if (defaultPlan.price === 0) {
        endDate.setFullYear(endDate.getFullYear() + 100);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      await Subscription.create({
        orgId: finalOrg._id,
        planId: defaultPlan._id,
        status: 'active',
        startDate: new Date(),
        endDate
      });

      await getOrCreateUsageRecord(finalOrg._id, 'documents');
      await getOrCreateUsageRecord(finalOrg._id, 'storage');
    }

    const user = await User.create({
      name,
      email,
      password,
      orgId: targetOrgId,
      role: assignedRole
    });

    if (!inviteCode) {
      finalOrg.adminId = user._id;
      await finalOrg.save();
    }

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      organization: { id: finalOrg._id, name: finalOrg.name, slug: finalOrg.slug }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let org = null;
    if (user.orgId) {
      org = await Organization.findById(user.orgId);
    }

    const token = generateToken(user);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      organization: org ? { id: org._id, name: org.name, slug: org.slug } : null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMe = async (req, res) => {
  try {
    if (req.user.role === 'super_admin') {
      return res.json({
        user: req.user,
        organization: null,
        subscription: null,
        usage: null
      });
    }

    const org = await Organization.findById(req.user.orgId);
    const subscription = await Subscription.findOne({
      orgId: req.user.orgId,
      status: 'active'
    }).populate('planId');

    const usageRecord = await getOrCreateUsageRecord(req.user.orgId, 'documents');
    const storageRecord = await getOrCreateUsageRecord(req.user.orgId, 'storage');

    res.json({
      user: req.user,
      organization: org,
      subscription: subscription ? {
        plan: subscription.planId,
        status: subscription.status,
        endDate: subscription.endDate
      } : null,
      usage: {
        documents: usageRecord.count,
        storage: storageRecord.count,
        limits: subscription ? subscription.planId.limits : {},
        resetsAt: usageRecord.periodEnd
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
