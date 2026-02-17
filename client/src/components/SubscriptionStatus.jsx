export default function SubscriptionStatus({ subscription }) {
  if (!subscription) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-medium">No active subscription</p>
      </div>
    );
  }

  const isExpiringSoon = new Date(subscription.endDate) - new Date() < 7 * 24 * 60 * 60 * 1000;

  return (
    <div className={`rounded-lg p-4 ${
      subscription.status === 'active'
        ? isExpiringSoon
          ? 'bg-yellow-50 border border-yellow-200'
          : 'bg-green-50 border border-green-200'
        : 'bg-red-50 border border-red-200'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`font-medium ${
            subscription.status === 'active'
              ? isExpiringSoon
                ? 'text-yellow-800'
                : 'text-green-800'
              : 'text-red-800'
          }`}>
            {subscription.plan.name} Plan
          </p>
          <p className={`text-sm ${
            subscription.status === 'active'
              ? isExpiringSoon
                ? 'text-yellow-700'
                : 'text-green-700'
              : 'text-red-700'
          }`}>
            {subscription.status === 'active'
              ? `Expires ${new Date(subscription.endDate).toLocaleDateString()}`
              : 'Expired'}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          subscription.status === 'active'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {subscription.status}
        </span>
      </div>
    </div>
  );
}
