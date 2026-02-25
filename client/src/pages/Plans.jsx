import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import api from '../middleware/api';
import { Plus, Check, CreditCard, FileText, Edit, Shield, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingPlan, setEditingPlan] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, plan: null });
  const [processingPayment, setProcessingPayment] = useState(false);
  const { user } = useAuth();
  const { subscription, refreshSubscription } = useSubscription();

  const isSuperAdmin = user?.role === 'super_admin';
  const isOrgAdmin = user?.role === 'admin';

  // Available features list
  const AVAILABLE_FEATURES = [
    { id: 'doc_crud', label: 'Document Management', description: 'Upload, view, and delete documents' },
    { id: 'sharing', label: 'Document Sharing', description: 'Share documents with other team members' },
    { id: 'versioning', label: 'Version Control', description: 'Upload and track multiple versions of documents' },
    { id: 'advanced_search', label: 'Advanced Search', description: 'Full-text semantic search capabilities' }
  ];

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

  // Toggle feature in the edit form array
  const handleToggleFeature = (featureId) => {
    setEditForm(prev => {
      const currentFeatures = prev.features || [];
      if (currentFeatures.includes(featureId)) {
        return { ...prev, features: currentFeatures.filter(f => f !== featureId) };
      } else {
        return { ...prev, features: [...currentFeatures, featureId] };
      }
    });
  };

  // Org admin — change subscription
  const handleChangePlan = (plan) => {
    // If upgrading to a paid plan or moving between paid plans, show payment modal
    if (plan.price > 0) {
      setPaymentModal({ isOpen: true, plan });
    } else {
      // Downgrading to free plan
      if (confirm(`Are you sure you want to downgrade to ${plan.name}? You may lose access to premium features.`)) {
        executePlanChange(plan._id);
      }
    }
  };

  const executePlanChange = async (planId) => {
    try {
      setProcessingPayment(true);

      // Simulate network/payment delay for paid plans
      if (paymentModal.isOpen) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await api.post('/subscription/change', { planId });
      refreshSubscription();
      setPaymentModal({ isOpen: false, plan: null });
      // Only show alert for successful silent downgrades, modal provides success feedback for upgrades
      if (!paymentModal.isOpen) alert('Plan changed successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to change plan');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Super admin — create plan configuration
  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/plans`, {
        name: editForm.name,
        features: editForm.features || [],
        limits: {
          maxDocuments: Number(editForm.maxDocuments || -1),
          maxStorage: Number(editForm.maxStorage || -1)
        },
        price: Number(editForm.price || 0),
        color: editForm.color || '#3b82f6'
      });
      setShowCreatePlan(false);
      setEditForm({});
      fetchPlans();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create plan');
    }
  };

  // Super admin — edit plan configuration
  const startEditing = (plan) => {
    setEditingPlan(plan._id);
    setEditForm({
      name: plan.name,
      features: [...plan.features],
      maxDocuments: plan.limits.maxDocuments,
      maxStorage: plan.limits.maxStorage,
      price: plan.price,
      color: plan.color || '#3b82f6'
    });
  };

  const cancelEditing = () => {
    setEditingPlan(null);
    setShowCreatePlan(false);
    setEditForm({});
  };

  const handleSavePlan = async (planId) => {
    try {
      await api.put(`/plans/${planId}`, {
        name: editForm.name,
        features: editForm.features || [],
        limits: {
          maxDocuments: Number(editForm.maxDocuments),
          maxStorage: Number(editForm.maxStorage)
        },
        price: Number(editForm.price),
        color: editForm.color || '#3b82f6'
      });
      setEditingPlan(null);
      fetchPlans();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update plan');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500 font-medium">Loading plans...</div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {isSuperAdmin ? 'Manage Platform Plans' : 'Subscription & Billing'}
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            {isSuperAdmin
              ? 'Configure subscription plans and limits for all organizations.'
              : 'Manage your organization\'s plan to unlock more features.'}
          </p>
        </div>
        {isSuperAdmin && !showCreatePlan && (
          <button
            onClick={() => {
              setEditForm({});
              setShowCreatePlan(true);
            }}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
          >
            <Plus className="w-5 h-5 mr-2 -ml-1" />
            Create New Plan
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm" role="alert">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Create Plan Form */}
      {isSuperAdmin && showCreatePlan && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-100 bg-blue-50/50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-500" />
              Create New Plan
            </h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleCreatePlan} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    placeholder="e.g. Pro Plus"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ($/mo)</label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      required
                      value={editForm.price || ''}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      className="w-full pl-7 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 bg-gray-50 rounded-lg p-5 border border-gray-100">
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Features Included</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {AVAILABLE_FEATURES.map(feature => (
                      <label key={feature.id} className="relative flex items-start p-4 border border-gray-200 rounded-lg bg-white hover:border-blue-400 cursor-pointer transition-colors shadow-sm">
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            checked={(editForm.features || []).includes(feature.id)}
                            onChange={() => handleToggleFeature(feature.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                          />
                        </div>
                        <div className="ml-3 flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{feature.label}</span>
                          <span className="text-xs text-gray-500 mt-1">{feature.description}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Documents <span className="text-gray-400 font-normal">(-1 = unlimited)</span></label>
                  <input
                    type="number"
                    required
                    value={editForm.maxDocuments || ''}
                    onChange={(e) => setEditForm({ ...editForm, maxDocuments: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    placeholder="-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Storage MB <span className="text-gray-400 font-normal">(-1 = unlimited)</span></label>
                  <input
                    type="number"
                    required
                    value={editForm.maxStorage || ''}
                    onChange={(e) => setEditForm({ ...editForm, maxStorage: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    placeholder="-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Plan Badge Color (Hex)</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      required
                      value={editForm.color || '#3b82f6'}
                      onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                      className="w-12 h-12 p-0.5 border border-gray-300 rounded-lg cursor-pointer shadow-sm"
                    />
                    <input
                      type="text"
                      required
                      value={editForm.color || '#3b82f6'}
                      onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                      className="w-32 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm font-mono uppercase"
                      placeholder="#3B82F6"
                      pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                    />
                    <span className="text-sm text-gray-500">Pick a color for the plan badge</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const isCurrent = subscription?.plan?._id === plan._id;
          const isEditing = editingPlan === plan._id;

          return (
            <div
              key={plan._id}
              className={`bg-white rounded-xl shadow-sm overflow-hidden flex flex-col h-full border ${
                isCurrent && !isSuperAdmin ? 'border-blue-500 ring-1 ring-blue-500 shadow-blue-100' : 'border-gray-200'
              } transition-all duration-200 hover:shadow-md`}
            >
              <div className="p-8 flex flex-col flex-1">
                {isCurrent && !isSuperAdmin && (
                  <div className="mb-6 flex">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      <Check className="w-3.5 h-3.5 mr-1 text-blue-600" />
                      Current Plan
                    </span>
                  </div>
                )}

                {/* Super admin edit mode */}
                {isSuperAdmin && isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Plan Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Price ($/mo)</label>
                      <input
                        type="number"
                        value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                      <label className="block text-xs font-semibold text-gray-700 mb-2">Features Included</label>
                      <div className="space-y-2">
                        {AVAILABLE_FEATURES.map(feature => (
                          <label key={feature.id} className="flex items-center space-x-2 p-2 bg-white border border-gray-200 rounded hover:border-blue-300 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={(editForm.features || []).includes(feature.id)}
                              onChange={() => handleToggleFeature(feature.id)}
                              className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 font-medium">{feature.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Max Docs (-1=∞)</label>
                        <input
                          type="number"
                          value={editForm.maxDocuments}
                          onChange={(e) => setEditForm({ ...editForm, maxDocuments: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Max MB (-1=∞)</label>
                        <input
                          type="number"
                          value={editForm.maxStorage}
                          onChange={(e) => setEditForm({ ...editForm, maxStorage: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Badge Color</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={editForm.color || '#3b82f6'}
                          onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                          className="w-9 h-9 p-0.5 border border-gray-300 rounded cursor-pointer shadow-sm"
                        />
                        <input
                          type="text"
                          value={editForm.color || '#3b82f6'}
                          onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono uppercase shadow-sm"
                          placeholder="#3B82F6"
                          pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-3">
                      <button
                        onClick={() => handleSavePlan(plan._id)}
                        className="flex-1 px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition shadow-sm text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition shadow-sm text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h2>
                    <div className="mb-6 pb-6 border-b border-gray-100">
                      <span className="text-4xl font-extrabold text-gray-900 tracking-tight">${plan.price}</span>
                      <span className="text-gray-500 font-medium ml-1">/month</span>
                    </div>

                    <ul className="space-y-4 mb-8 flex-1">
                      <li className="flex items-start text-gray-700">
                        <Check className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="font-medium">
                          {plan.limits.maxDocuments === -1
                            ? 'Unlimited documents'
                            : `${plan.limits.maxDocuments} documents`}
                        </span>
                      </li>
                      <li className="flex items-start text-gray-700">
                        <Check className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="font-medium">
                          {plan.limits.maxStorage === -1
                            ? 'Unlimited storage'
                            : `${plan.limits.maxStorage} MB storage`}
                        </span>
                      </li>
                      {plan.features.includes('doc_crud') && (
                        <li className="flex items-start text-gray-700">
                          <Check className="w-5 h-5 text-emerald-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span>Document management</span>
                        </li>
                      )}
                      {plan.features.includes('sharing') && (
                        <li className="flex items-start text-gray-700">
                          <Check className="w-5 h-5 text-emerald-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span>Secure document sharing</span>
                        </li>
                      )}
                      {plan.features.includes('versioning') && (
                        <li className="flex items-start text-gray-700">
                          <Check className="w-5 h-5 text-emerald-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span>Full version control</span>
                        </li>
                      )}
                      {plan.features.includes('advanced_search') && (
                        <li className="flex items-start text-gray-700">
                          <Check className="w-5 h-5 text-emerald-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span>Advanced semantic search</span>
                        </li>
                      )}
                    </ul>

                    {/* Super admin — edit plan configuration */}
                    {isSuperAdmin && (
                      <div className="mt-auto pt-6 border-t border-gray-100">
                        <button
                          onClick={() => startEditing(plan)}
                          className="w-full flex justify-center items-center px-4 py-2.5 border border-gray-300 text-gray-700 bg-white font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                        >
                          <Edit className="w-4 h-4 mr-2 text-gray-500" />
                          Edit Configuration
                        </button>
                      </div>
                    )}

                    {/* Org admin — upgrade/downgrade subscription */}
                    {isOrgAdmin && !isCurrent && (
                      <div className="mt-auto pt-6 border-t border-gray-100">
                        <button
                          onClick={() => handleChangePlan(plan)}
                          className="w-full px-4 py-2.5 text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors shadow-sm font-medium flex justify-center items-center"
                        >
                          {plan.price > (subscription?.plan?.price || 0) ? `Upgrade to ${plan.name}` : `Downgrade to ${plan.name}`}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </button>
                      </div>
                    )}

                    {/* Member — no action */}
                    {!isSuperAdmin && !isOrgAdmin && !isCurrent && (
                      <div className="mt-auto pt-6 border-t border-gray-100 text-center">
                        <p className="text-sm font-medium text-gray-500 bg-gray-50 py-2 rounded-lg border border-gray-100 flex items-center justify-center gap-2">
                          <Lock className="w-4 h-4" />
                          Only Admins can change plans
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Modal */}
      {paymentModal.isOpen && paymentModal.plan && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur-sm" aria-hidden="true" onClick={() => !processingPayment && setPaymentModal({ isOpen: false, plan: null })}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-100 relative">

              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-semibold text-gray-900" id="modal-title">
                      Complete Your Upgrade
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        You are upgrading to the <span className="font-semibold text-gray-800">{paymentModal.plan.name}</span> plan.
                      </p>

                      <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">Billed Monthly</span>
                          <span className="text-lg font-bold text-gray-900">${paymentModal.plan.price}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-200 pt-2 mt-2">
                          <span>Due Today</span>
                          <span className="font-semibold text-gray-700">${paymentModal.plan.price}</span>
                        </div>
                      </div>

                      {/* Dummy Credit Card Form */}
                      <div className="mt-5 space-y-3">
                        <label className="block text-xs font-medium text-gray-700 text-left">Card Information (Dummy)</label>
                        <div className="relative">
                          <input type="text" className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400" placeholder="Card number" defaultValue="4242 4242 4242 4242" disabled={processingPayment} />
                          <div className="absolute right-3 top-2.5">
                            <CreditCard className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="text" className="border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400" placeholder="MM/YY" defaultValue="12/25" disabled={processingPayment} />
                          <input type="text" className="border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400" placeholder="CVC" defaultValue="123" disabled={processingPayment} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => executePlanChange(paymentModal.plan._id)}
                  disabled={processingPayment}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {processingPayment ? (
                    <span className="flex items-center">
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                      Processing...
                    </span>
                  ) : (
                    `Pay $${paymentModal.plan.price}`
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentModal({ isOpen: false, plan: null })}
                  disabled={processingPayment}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
