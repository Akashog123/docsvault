import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../middleware/api';
import FeatureGate from '../components/FeatureGate';
import { Search as SearchIcon, Loader2, FileText, User, Calendar, HardDrive, Link2, ArrowRight } from 'lucide-react';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

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

  return (
    <div className="space-y-8 pb-12">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Advanced Search</h1>
        <p className="text-gray-500 mt-2 text-lg">Search through all your documents using full-text semantic search.</p>
      </div>

      <FeatureGate
        feature="advanced_search"
        fallback={
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-8 text-center shadow-sm">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <SearchIcon className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-amber-900 mb-2">Feature Not Available</h2>
            <p className="text-amber-800 mb-6 max-w-md mx-auto">Advanced semantic search is a premium feature not included in your current plan.</p>
            {isAdmin ? (
              <Link to="/plans" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-sm">
                Upgrade your plan
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            ) : (
              <div className="inline-flex items-center justify-center px-6 py-3 border border-amber-300 text-base font-medium rounded-lg text-amber-800 bg-amber-50">
                Contact your organization administrator to upgrade.
              </div>
            )}
          </div>
        }
      >
        <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, description, or content..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow shadow-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                Searching...
              </>
            ) : 'Search Documents'}
          </button>
        </form>
      </FeatureGate>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm" role="alert">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Search Results ({results.length})
            </h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {results.map((doc) => (
              <li key={doc._id} className="p-6 hover:bg-gray-50/50 transition-colors group">
                <a href={`/documents/${doc._id}`} className="block">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100 mt-1">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-lg font-semibold text-blue-600 group-hover:text-blue-800 group-hover:underline transition-colors">{doc.title}</h3>
                      <p className="text-gray-600 mt-1.5 text-sm line-clamp-2">{doc.description}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-gray-500 font-medium">
                        <span className="flex items-center">
                          <User className="w-4 h-4 mr-1 text-gray-400" />
                          {doc.uploadedBy?.name}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                          {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="flex items-center">
                          <HardDrive className="w-4 h-4 mr-1 text-gray-400" />
                          {(doc.fileSize / 1024).toFixed(1)} KB
                        </span>
                        <span className="flex items-center">
                          <Link2 className="w-4 h-4 mr-1 text-gray-400" />
                          <span className="truncate max-w-[200px]">{doc.originalFileName || doc.fileName}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {results.length === 0 && query && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No results found</h3>
          <p className="text-gray-500">We couldn't find any documents matching "{query}". Try adjusting your search terms.</p>
        </div>
      )}
    </div>
  );
}
