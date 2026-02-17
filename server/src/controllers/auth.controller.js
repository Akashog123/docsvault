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
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

export const register = async (req, res) => {
  try {
    const { name, email, password, orgName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create organization
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existingOrg = await Organization.findOne({ slug });
    if (existingOrg) {
      return res.status(400).json({ error: 'Organization name already taken' });
    }

    const org = await Organization.create({ name: orgName, slug });

    // Create admin user
    const user = await User.create({
      name,
      email,
      password,
      orgId: org._id,
      role: 'admin'
    });

    // Assign Free plan by default
    const freePlan = await Plan.findOne({ name: 'Free' });
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 100); // Free plan doesn't expire

    await Subscription.create({
      orgId: org._id,
      planId: freePlan._id,
      status: 'active',
      startDate: new Date(),
      endDate
    });

    // Initialize usage record
    await getOrCreateUsageRecord(org._id, 'documents');

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      organization: { id: org._id, name: org.name, slug: org.slug }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    const org = await Organization.findById(user.orgId);
    const token = generateToken(user);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      organization: { id: org._id, name: org.name, slug: org.slug }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const org = await Organization.findById(req.user.orgId);
    const subscription = await Subscription.findOne({
      orgId: req.user.orgId,
      status: 'active'
    }).populate('planId');

    const usageRecord = await getOrCreateUsageRecord(req.user.orgId, 'documents');

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
        limit: subscription ? subscription.planId.limits.maxDocuments : 0,
        resetsAt: usageRecord.periodEnd
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
