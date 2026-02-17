const checkFeature = (featureName) => {
  return (req, res, next) => {
    const { plan } = req.subscription;

    if (!plan.features.includes(featureName)) {
      return res.status(403).json({
        error: `Feature '${featureName}' is not available in your ${plan.name} plan`,
        currentPlan: plan.name,
        requiredFeature: featureName
      });
    }

    next();
  };
};

export default checkFeature;
