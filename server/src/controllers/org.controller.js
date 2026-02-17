import Organization from '../models/Organization.js';
import User from '../models/User.js';

export const getOrg = async (req, res) => {
  try {
    const org = await Organization.findById(req.user.orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const members = await User.find({ orgId: req.user.orgId }).select('name email role createdAt');

    res.json({ organization: org, members });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

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
    res.status(500).json({ error: error.message });
  }
};
