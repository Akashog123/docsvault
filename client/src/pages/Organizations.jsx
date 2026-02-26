import { useState, useEffect } from 'react';
import api from '../middleware/api';
import { Building2, Users, ChevronDown, ChevronRight, Loader2, Mail, Shield, Calendar } from 'lucide-react';

export default function Organizations() {
  const [organizations, setOrganizations] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, offset: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedOrg, setExpandedOrg] = useState(null);

  useEffect(() => {
    fetchOrganizations();
  }, [pagination.offset]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/organizations', {
        params: { limit: pagination.limit, offset: pagination.offset }
      });
      setOrganizations(data.organizations);
      setPagination(prev => ({ ...prev, total: data.pagination.total }));
    } catch (err) {
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  const goToPage = (page) => {
    setPagination(prev => ({ ...prev, offset: (page - 1) * prev.limit }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-sm text-gray-500 mt-1">{pagination.total} total organizations</p>
        </div>
      </div>

      <div className="space-y-4">
        {organizations.map((org) => (
          <div key={org.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Organization Header */}
            <button
              onClick={() => setExpandedOrg(expandedOrg === org.id ? null : org.id)}
              className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-semibold text-gray-900">{org.name}</h3>
                  <p className="text-xs text-gray-500">{org.slug}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Users className="w-4 h-4" />
                  <span>{org.members.length + (org.admin ? 1 : 0)} members</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(org.createdAt).toLocaleDateString()}</span>
                </div>
                {expandedOrg === org.id
                  ? <ChevronDown className="w-5 h-5 text-gray-400" />
                  : <ChevronRight className="w-5 h-5 text-gray-400" />
                }
              </div>
            </button>

            {/* Expanded Members List */}
            {expandedOrg === org.id && (
              <div className="border-t border-gray-100 bg-gray-50 p-5">
                {/* Admin */}
                {org.admin && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Admin</p>
                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm">
                        {org.admin.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{org.admin.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {org.admin.email}
                        </p>
                      </div>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Admin
                      </span>
                    </div>
                  </div>
                )}

                {/* Members */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Members ({org.members.length})
                  </p>
                  {org.members.length === 0 ? (
                    <p className="text-sm text-gray-400 italic py-2">No other members</p>
                  ) : (
                    <div className="space-y-2">
                      {org.members.map((member) => (
                        <div key={member._id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                            {member.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {member.email}
                            </p>
                          </div>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium capitalize">
                            {member.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
