import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import FeatureGate from '../components/FeatureGate';
import api from '../middleware/api';
import { ArrowLeft, Edit, FileText, Download, Users, Clock, HardDrive, Calendar, Check } from 'lucide-react';

export default function DocumentDetail() {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const { subscription } = useSubscription();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const fetchDocument = async () => {
    try {
      const { data } = await api.get(`/docs/${id}`);
      setDocument(data);
      setEditForm({ title: data.title, description: data.description || '' });
    } catch (err) {
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDocument = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put(`/docs/${id}`, editForm);
      setDocument(data);
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update document');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!document) return <div>Document not found</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <Link to="/documents" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors mb-4">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Documents
        </Link>

        {isEditing ? (
          <form onSubmit={handleUpdateDocument} className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors">
                  Save Changes
                </button>
                <button type="button" onClick={() => setIsEditing(false)} className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{document.title}</h1>
              {document.description && (
                <p className="text-gray-600 mt-2 text-lg">{document.description}</p>
              )}
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Edit className="w-4 h-4 mr-2 text-gray-500" />
              Edit Details
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            Document Information
          </h2>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
            <div className="flex flex-col">
              <dt className="text-sm font-medium text-gray-500 mb-1">File Name</dt>
              <dd className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-100 break-all">{document.originalFileName || document.fileName}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-sm font-medium text-gray-500 mb-1">File Size</dt>
              <dd className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-100">{(document.fileSize / 1024).toFixed(2)} KB</dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-sm font-medium text-gray-500 mb-1">File Type</dt>
              <dd className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-100 uppercase">{document.mimeType.split('/').pop() || document.mimeType}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="text-sm font-medium text-gray-500 mb-1">Uploaded By</dt>
              <dd className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-100 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                  {document.uploadedBy?.name?.charAt(0).toUpperCase()}
                </div>
                {document.uploadedBy?.name}
              </dd>
            </div>
            <div className="flex flex-col sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500 mb-1">Upload Date</dt>
              <dd className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-100">
                {new Date(document.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </dd>
            </div>
          </dl>
          <div className="mt-8 border-t border-gray-100 pt-6">
            <button
              onClick={async () => {
                try {
                  const response = await api.get(`/docs/${document._id}/download`, { responseType: 'blob' });
                  const url = window.URL.createObjectURL(new Blob([response.data]));
                  const link = window.document.createElement('a');
                  link.href = url;
                  link.download = document.originalFileName || document.fileName;
                  link.click();
                  window.URL.revokeObjectURL(url);
                } catch {
                  setError('Download failed');
                }
              }}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="w-5 h-5 mr-2 -ml-1" />
              Download File
            </button>
          </div>
        </div>
      </div>

      {/* Sharing Section */}
      <FeatureGate
        feature="sharing"
        fallback={
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-8 text-center shadow-sm">
            <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-amber-900 mb-1">Advanced Sharing</h3>
            <p className="text-amber-800 text-sm mb-4">Secure document sharing is not available on your current plan.</p>
            {isAdmin ? (
              <Link to="/plans" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-sm">
                Upgrade to unlock sharing
              </Link>
            ) : (
              <p className="text-sm font-medium text-amber-700 bg-amber-100/50 inline-block px-3 py-1.5 rounded-md">Contact administrator to upgrade</p>
            )}
          </div>
        }
      >
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              Share Document
            </h2>
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-100">
              {document.sharedWith?.length || 0} Users
            </span>
          </div>
          <div className="p-6">
            {document.sharedWith?.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {document.sharedWith.map((user) => (
                  <li key={user._id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center text-purple-700 font-bold text-sm border border-purple-200 flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>This document hasn't been shared with anyone yet.</p>
              </div>
            )}
          </div>
        </div>
      </FeatureGate>

      {/* Version History */}
      <FeatureGate
        feature="versioning"
        fallback={
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-8 text-center shadow-sm">
            <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-amber-900 mb-1">Version Control</h3>
            <p className="text-amber-800 text-sm mb-4">Document version history is not available on your current plan.</p>
            {isAdmin ? (
              <Link to="/plans" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-sm">
                Upgrade to unlock versioning
              </Link>
            ) : (
              <p className="text-sm font-medium text-amber-700 bg-amber-100/50 inline-block px-3 py-1.5 rounded-md">Contact administrator to upgrade</p>
            )}
          </div>
        }
      >
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              Version History
            </h2>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-100">
              Current: v{document.currentVersion}
            </span>
          </div>
          <div className="p-0">
            {document.versions?.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {[...document.versions].reverse().map((version) => (
                  <li key={version.versionNumber} className="p-6 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border flex-shrink-0 ${
                          version.versionNumber === document.currentVersion
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                          v{version.versionNumber}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {version.originalFileName || version.fileName}
                            {version.versionNumber === document.currentVersion && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                                Latest
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-medium">
                            <span className="flex items-center">
                              <HardDrive className="w-3.5 h-3.5 mr-1" />
                              {(version.fileSize / 1024).toFixed(1)} KB
                            </span>
                            <span className="flex items-center">
                              <Calendar className="w-3.5 h-3.5 mr-1" />
                              {new Date(version.uploadedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6 text-center text-gray-500">No version history available.</div>
            )}
          </div>
        </div>
      </FeatureGate>
    </div>
  );
}
