import { getUsagePercentage } from '../utils/features';

export default function UsageBar({ usage, metric }) {
  if (!usage || !usage[metric]) return null;

  const { current, limit } = usage[metric];
  const percentage = getUsagePercentage(usage, metric);

  const color = percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Usage</span>
        <span className="font-medium">
          {current} / {limit === -1 ? '∞' : limit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
