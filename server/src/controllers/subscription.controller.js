import Subscription from '../models/Subscription.js';
import Plan from '../models/Plan.js';
import { getOrCreateUsageRecord } from '../utils/usageTracker.js';

export const getCurrentSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      orgId: req.user.orgId,
      status: 'active'
    }).populate('planId');

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription' });
    }

    const usageRecord = await getOrCreateUsageRecord(req.user.orgId, 'documents');
    const storageRecord = await getOrCreateUsageRecord(req.user.orgId, 'storage');

    res.json({
      subscription: {
        id: subscription._id,
        plan: subscription.planId,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate
      },
      usage: {
        documents: {
          current: usageRecord.count,
          limit: subscription.planId.limits.maxDocuments,
          resetsAt: usageRecord.periodEnd
        },
        storage: {
          current: storageRecord.count,
          limit: subscription.planId.limits.maxStorage,
          resetsAt: storageRecord.periodEnd
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const changePlan = async (req, res) => {
  try {
    const { planId } = req.body;

    const newPlan = await Plan.findById(planId);
    if (!newPlan || !newPlan.isActive) {
      return res.status(400).json({ error: 'Invalid or inactive plan' });
    }

    // Expire current subscription
    await Subscription.updateMany(
      { orgId: req.user.orgId, status: 'active' },
      { status: 'expired' }
    );

    // Create new subscription
    const startDate = new Date();
    const endDate = new Date();
    if (newPlan.price === 0) {
      endDate.setFullYear(endDate.getFullYear() + 100); // Free doesn't expire
    } else {
      endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription
    }

    const subscription = await Subscription.create({
      orgId: req.user.orgId,
      planId: newPlan._id,
      status: 'active',
      startDate,
      endDate
    });

    await subscription.populate('planId');

    res.json({
      message: `Plan changed to ${newPlan.name}`,
      subscription: {
        id: subscription._id,
        plan: subscription.planId,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
