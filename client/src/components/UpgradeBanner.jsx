import { Link } from 'react-router-dom';

export default function UpgradeBanner({ message, planName }) {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">Upgrade to {planName || 'unlock this feature'}</h3>
          <p className="text-blue-100">{message || 'Get access to advanced features and higher limits'}</p>
        </div>
        <Link
          to="/plans"
          className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-md hover:bg-blue-50 transition"
        >
          View Plans
        </Link>
      </div>
    </div>
  );
}
