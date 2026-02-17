import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSubscription } from '../context/SubscriptionContext';
import { isWithinLimit } from '../utils/features';
import api from '../middleware/api';

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', file: null });
  const [error, setError] = useState('');
  const { usage, refreshSubscription } = useSubscription();

  const canUpload = usage ? isWithinLimit(usage, 'documents') : false;

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

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
        <button
          onClick={() => setShowUpload(!showUpload)}
          disabled={!canUpload}
          className={`px-4 py-2 rounded-md transition ${
            canUpload
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Upload Document
        </button>
      </div>

      {!canUpload && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Document limit reached. <Link to="/plans" className="underline">Upgrade your plan</Link> to upload more.</p>
        </div>
      )}

      {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}

      {showUpload && canUpload && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Upload New Document</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
              <input
                type="file"
                onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                required
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Upload
              </button>
              <button type="button" onClick={() => setShowUpload(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.map((doc) => (
              <tr key={doc._id}>
                <td className="px-6 py-4">
                  <Link to={`/documents/${doc._id}`} className="text-blue-600 hover:underline">
                    {doc.title}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{(doc.fileSize / 1024).toFixed(2)} KB</td>
                <td className="px-6 py-4 text-sm text-gray-500">{doc.uploadedBy?.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{new Date(doc.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-sm">
                  <button
                    onClick={() => handleDelete(doc._id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {documents.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No documents yet. Upload your first document to get started.
          </div>
        )}
      </div>
    </div>
  );
}
