import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import api from '../middleware/api';

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const { subscription, refreshSubscription } = useSubscription();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data } = await api.get('/plans');
      setPlans(data);
    } catch (err) {
      setError('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async (planId) => {
    if (!confirm('Change to this plan?')) return;
    try {
      await api.post('/subscription/change', { planId });
      alert('Plan changed successfully!');
      refreshSubscription();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to change plan');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
        <p className="text-gray-600 mt-1">Choose the plan that fits your needs</p>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = subscription?.plan?._id === plan._id;
          return (
            <div
              key={plan._id}
              className={`bg-white rounded-lg shadow-lg overflow-hidden ${
                isCurrent ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="p-6">
                {isCurrent && (
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full mb-4">
                    Current Plan
                  </span>
                )}
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h2>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-600">/month</span>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-gray-700">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>
                      {plan.limits.maxDocuments === -1
                        ? 'Unlimited documents'
                        : `${plan.limits.maxDocuments} documents`}
                    </span>
                  </div>
                  {plan.features.includes('doc_crud') && (
                    <div className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Document management</span>
                    </div>
                  )}
                  {plan.features.includes('sharing') && (
                    <div className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Document sharing</span>
                    </div>
                  )}
                  {plan.features.includes('versioning') && (
                    <div className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Version control</span>
                    </div>
                  )}
                  {plan.features.includes('advanced_search') && (
                    <div className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Advanced search</span>
                    </div>
                  )}
                </div>

                {user?.role === 'admin' && !isCurrent && (
                  <button
                    onClick={() => handleChangePlan(plan._id)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                  >
                    Change to {plan.name}
                  </button>
                )}
                {user?.role !== 'admin' && !isCurrent && (
                  <div className="text-center text-sm text-gray-500">
                    Contact your admin to change plans
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
