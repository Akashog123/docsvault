import Subscription from '../models/Subscription.js';

const attachSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({
      orgId: req.user.orgId,
      status: 'active'
    }).populate('planId');

    if (!subscription) {
      return res.status(403).json({ error: 'No active subscription' });
    }

    // Check expiration — lazy lifecycle transition
    if (subscription.endDate < new Date()) {
      subscription.status = 'expired';
      await subscription.save();
      return res.status(403).json({
        error: 'Subscription expired',
        expiredAt: subscription.endDate
      });
    }

    req.subscription = {
      id: subscription._id,
      plan: subscription.planId,
      status: subscription.status,
      endDate: subscription.endDate
    };

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to verify subscription' });
  }
};

export default attachSubscription;
