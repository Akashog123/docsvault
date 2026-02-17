import { useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import { hasFeature } from '../utils/features';
import api from '../middleware/api';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { subscription } = useSubscription();

  const canSearch = hasFeature(subscription, 'advanced_search');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/docs/search?q=${encodeURIComponent(query)}`);
      setResults(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  if (!canSearch) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Advanced Search</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-yellow-900 mb-2">Enterprise Feature</h2>
          <p className="text-yellow-800 mb-4">Advanced search is only available on the Enterprise plan.</p>
          <a href="/plans" className="inline-block px-6 py-3 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition">
            Upgrade to Enterprise
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Advanced Search</h1>

      <form onSubmit={handleSearch} className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}

      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Search Results ({results.length})</h2>
          </div>
          <ul className="divide-y divide-gray-200">
            {results.map((doc) => (
              <li key={doc._id} className="p-6 hover:bg-gray-50">
                <a href={`/documents/${doc._id}`} className="block">
                  <h3 className="text-lg font-medium text-blue-600 hover:underline">{doc.title}</h3>
                  <p className="text-gray-600 mt-1">{doc.description}</p>
                  <div className="flex gap-4 mt-2 text-sm text-gray-500">
                    <span>By {doc.uploadedBy?.name}</span>
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                    <span>{(doc.fileSize / 1024).toFixed(2)} KB</span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {results.length === 0 && query && !loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No documents found matching "{query}"
        </div>
      )}
    </div>
  );
}
