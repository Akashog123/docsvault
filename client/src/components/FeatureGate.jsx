import { useSubscription } from '../context/SubscriptionContext';
import { hasFeature } from '../utils/features';

export default function FeatureGate({ feature, children, fallback }) {
  const { subscription } = useSubscription();

  if (hasFeature(subscription, feature)) {
    return children;
  }

  return fallback || (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
      <p className="text-gray-500">This feature requires an upgraded plan.</p>
    </div>
  );
}
