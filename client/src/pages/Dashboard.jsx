import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { getUsagePercentage } from '../utils/features';
import api from '../middleware/api';

export default function Dashboard() {
  const { user, organization } = useAuth();
  const { subscription, usage } = useSubscription();
  const [stats, setStats] = useState({ documents: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/docs');
        setStats({ documents: data.length });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };
    fetchStats();
  }, []);

  const usagePercent = usage ? getUsagePercentage(usage, 'documents') : 0;
  const usageColor = usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, {user?.name}</p>
      </div>

      {/* Subscription Status Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Subscription Status</h2>
        {subscription ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Current Plan:</span>
              <span className="font-semibold text-lg">{subscription.plan.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm ${subscription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {subscription.status}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Expires:</span>
              <span className="text-gray-900">{new Date(subscription.endDate).toLocaleDateString()}</span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No active subscription</p>
        )}
      </div>

      {/* Usage Card */}
      {usage && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Document Usage</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Documents Used:</span>
              <span className="font-semibold">
                {usage.documents.current} / {usage.documents.limit === -1 ? '∞' : usage.documents.limit}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className={`${usageColor} h-3 rounded-full transition-all`} style={{ width: `${Math.min(usagePercent, 100)}%` }}></div>
            </div>
            <p className="text-sm text-gray-500">Resets: {new Date(usage.documents.resetsAt).toLocaleDateString()}</p>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/documents" className="bg-blue-50 hover:bg-blue-100 rounded-lg p-6 transition">
          <h3 className="font-semibold text-blue-900 mb-2">Documents</h3>
          <p className="text-blue-700 text-2xl font-bold">{stats.documents}</p>
        </Link>
        <Link to="/plans" className="bg-purple-50 hover:bg-purple-100 rounded-lg p-6 transition">
          <h3 className="font-semibold text-purple-900 mb-2">Upgrade Plan</h3>
          <p className="text-purple-700 text-sm">View available plans</p>
        </Link>
        <Link to="/settings" className="bg-gray-50 hover:bg-gray-100 rounded-lg p-6 transition">
          <h3 className="font-semibold text-gray-900 mb-2">Organization</h3>
          <p className="text-gray-700 text-sm">{organization?.name}</p>
        </Link>
      </div>
    </div>
  );
}
