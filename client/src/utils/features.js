export const hasFeature = (subscription, featureName) => {
  if (!subscription || !subscription.plan) return false;
  return subscription.plan.features.includes(featureName);
};

export const isWithinLimit = (usage, metric) => {
  if (!usage || !usage[metric]) return false;
  const { current, limit } = usage[metric];
  if (limit === -1) return true;
  return current < limit;
};

export const getUsagePercentage = (usage, metric) => {
  if (!usage || !usage[metric]) return 0;
  const { current, limit } = usage[metric];
  if (limit === -1) return 0;
  return Math.round((current / limit) * 100);
};
