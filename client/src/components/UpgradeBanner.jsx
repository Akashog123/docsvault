import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function UpgradeBanner({ message, planName }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">
            {isAdmin
              ? `Upgrade to ${planName || 'unlock this feature'}`
              : 'Feature not available on current plan'}
          </h3>
          <p className="text-blue-100">
            {isAdmin
              ? (message || 'Get access to advanced features and higher limits')
              : 'Contact your organization administrator to upgrade your plan.'}
          </p>
        </div>
        {isAdmin && (
          <Link
            to="/plans"
            className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-md hover:bg-blue-50 transition"
          >
            View Plans
          </Link>
        )}
      </div>
    </div>
  );
}
