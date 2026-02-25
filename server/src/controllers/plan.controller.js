import Plan from '../models/Plan.js';

export const getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ price: 1 });
    res.json(plans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createPlan = async (req, res) => {
  try {
    const { name, features, limits, price, color } = req.body;

    if (!name || !features || !limits || price === undefined) {
      return res.status(400).json({ error: 'Missing required fields: name, features, limits, price' });
    }

    const existing = await Plan.findOne({ name });
    if (existing) {
      return res.status(400).json({ error: 'A plan with this name already exists' });
    }

    const plan = await Plan.create({ name, features, limits, price, color: color || '#3b82f6', isActive: true });
    res.status(201).json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, features, limits, price, color, isActive } = req.body;

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    if (name !== undefined) plan.name = name;
    if (features !== undefined) plan.features = features;
    if (limits !== undefined) plan.limits = limits;
    if (price !== undefined) plan.price = price;
    if (color !== undefined) plan.color = color;
    if (isActive !== undefined) plan.isActive = isActive;

    await plan.save();
    res.json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
