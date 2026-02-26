import Organization from '../models/Organization.js';
import User from '../models/User.js';
import crypto from 'crypto';

export const getOrg = async (req, res) => {
  try {
    const org = await Organization.findById(req.user.orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const members = await User.find({ orgId: req.user.orgId }).select('name email role createdAt');

    res.json({ organization: org, members });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Org admins can only create members
    if (role && role !== 'member') {
      return res.status(403).json({ error: 'Organization admins can only create member users' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      password,
      orgId: req.user.orgId,
      role: role || 'member'
    });

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const generateInviteCode = async (req, res) => {
  try {
    const org = await Organization.findById(req.user.orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Generate a random 8-character hex string
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    org.inviteCode = code;
    await org.save();

    res.json({ inviteCode: org.inviteCode });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOrgMembers = async (req, res) => {
  try {
    const members = await User.find({ orgId: req.user.orgId }).select('name email role');
    res.json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getInviteCode = async (req, res) => {
  try {
    const org = await Organization.findById(req.user.orgId).select('inviteCode');
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({ inviteCode: org.inviteCode || null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
