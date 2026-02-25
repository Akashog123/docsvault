import { useSubscription } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';
import { hasFeature } from '../utils/features';
import { Link } from 'react-router-dom';

export default function FeatureGate({ feature, children, fallback }) {
  const { subscription } = useSubscription();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  if (hasFeature(subscription, feature)) {
    return children;
  }

  return fallback || (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
      <p className="text-gray-500 mb-2">This feature is not available on your current plan.</p>
      {isAdmin ? (
        <Link to="/plans" className="text-blue-600 hover:underline">
          Upgrade your plan
        </Link>
      ) : (
        <p className="text-sm text-gray-400">Contact your organization administrator to upgrade.</p>
      )}
    </div>
  );
}
