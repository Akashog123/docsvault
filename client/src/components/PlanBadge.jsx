export default function PlanBadge({ planName }) {
  const colors = {
    Free: 'bg-gray-100 text-gray-800',
    Pro: 'bg-blue-100 text-blue-800',
    Enterprise: 'bg-purple-100 text-purple-800'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[planName] || 'bg-gray-100 text-gray-800'}`}>
      {planName}
    </span>
  );
}
