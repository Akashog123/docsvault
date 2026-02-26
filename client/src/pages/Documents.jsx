import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { isWithinLimit } from '../utils/features';
import api from '../middleware/api';
import { Upload, AlertTriangle, FileText, Trash2, Plus, Check, ArrowLeft } from 'lucide-react';

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', file: null });
  const [error, setError] = useState('');
  const { usage, refreshSubscription } = useSubscription();
  const { user } = useAuth();

  const usageLoaded = usage !== null;
  const canUpload = usageLoaded ? isWithinLimit(usage, 'documents') : true;
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data } = await api.get('/docs');
      setDocuments(data);
    } catch (err) {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError('');

    const formData = new FormData();
    formData.append('title', uploadForm.title);
    formData.append('description', uploadForm.description);
    formData.append('file', uploadForm.file);

    try {
      await api.post('/docs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowUpload(false);
      setUploadForm({ title: '', description: '', file: null });
      fetchDocuments();
      refreshSubscription();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this document?')) return;
    try {
      await api.delete(`/docs/${id}`);
      fetchDocuments();
      refreshSubscription();
    } catch (err) {
      setError('Failed to delete document');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500 font-medium">Loading documents...</div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Documents</h1>
          <p className="text-gray-500 mt-2 text-lg">Manage and view all your organization's files.</p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          disabled={!canUpload}
          className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap ${
            canUpload
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
          }`}
        >
          <Upload className="w-5 h-5 mr-2 -ml-1" />
          Upload Document
        </button>
      </div>

      {usageLoaded && !canUpload && (
        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-md p-4 shadow-sm flex items-start">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-amber-800 text-sm">
            <span className="font-semibold block mb-1">Document limit reached</span>
            {isAdmin ? (
              <>You've reached your plan's storage limit. <Link to="/plans" className="underline font-semibold hover:text-amber-900 transition-colors">Upgrade your plan</Link> to continue uploading.</>
            ) : (
              'You have reached the maximum document limit. Contact your organization administrator to upgrade.'
            )}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm" role="alert">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {showUpload && canUpload && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-gray-400" />
              Upload New Document
            </h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleUpload} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  required
                  placeholder="E.g., Q3 Financial Report"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-shadow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(Optional)</span></label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-shadow resize-y"
                  rows="3"
                  placeholder="Brief description of this document..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                <div
                  className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative"
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 justify-center">
                      <span className="relative font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 px-1">
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          onChange={(e) => {
                            // Stop propagation so we don't trigger the div click twice
                            e.stopPropagation();
                            setUploadForm({ ...uploadForm, file: e.target.files[0] })
                          }}
                          onClick={(e) => e.stopPropagation()}
                          required
                        />
                      </span>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {uploadForm.file ? (
                        <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                          {uploadForm.file.name} ({(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      ) : (
                        'PDF, DOCX, PNG, JPG up to 10MB'
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Document Title</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Size</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Uploaded By</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {documents.map((doc) => (
                <tr key={doc._id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-50 text-blue-600 rounded flex items-center justify-center border border-blue-100">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <Link to={`/documents/${doc._id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                          {doc.title}
                        </Link>
                        <div className="text-xs text-gray-500 truncate max-w-[200px] sm:max-w-xs">{doc.originalFileName || doc.fileName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell whitespace-nowrap">
                    {(doc.fileSize / 1024).toFixed(1)} KB
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                        {doc.uploadedBy?.name?.charAt(0).toUpperCase()}
                      </div>
                      {doc.uploadedBy?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                    {(isAdmin || doc.uploadedBy?._id === user?.id) && (
                      <button
                        onClick={() => handleDelete(doc._id)}
                        className="text-gray-400 hover:text-red-600 p-2 rounded-md hover:bg-red-50 transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {documents.length === 0 && !loading && (
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No documents found</h3>
              <p className="text-gray-500 max-w-sm mx-auto mb-6">You haven't uploaded any documents yet. Get started by uploading your first file.</p>
              <button
                onClick={() => setShowUpload(true)}
                disabled={!canUpload}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4 mr-2 -ml-1" />
                Upload First Document
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
