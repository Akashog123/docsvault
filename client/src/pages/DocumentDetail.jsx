import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSubscription } from '../context/SubscriptionContext';
import { hasFeature } from '../utils/features';
import api from '../middleware/api';

export default function DocumentDetail() {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { subscription } = useSubscription();

  const canShare = hasFeature(subscription, 'sharing');
  const canVersion = hasFeature(subscription, 'versioning');

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const fetchDocument = async () => {
    try {
      const { data } = await api.get(`/docs/${id}`);
      setDocument(data);
    } catch (err) {
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!document) return <div>Document not found</div>;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/documents" className="text-blue-600 hover:underline mb-4 inline-block">← Back to Documents</Link>
        <h1 className="text-3xl font-bold text-gray-900">{document.title}</h1>
        <p className="text-gray-600 mt-2">{document.description}</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Document Details</h2>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-gray-600">File Name:</dt>
            <dd className="font-medium">{document.fileName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Size:</dt>
            <dd className="font-medium">{(document.fileSize / 1024).toFixed(2)} KB</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Type:</dt>
            <dd className="font-medium">{document.mimeType}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Uploaded By:</dt>
            <dd className="font-medium">{document.uploadedBy?.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Created:</dt>
            <dd className="font-medium">{new Date(document.createdAt).toLocaleString()}</dd>
          </div>
        </dl>
      </div>

      {/* Sharing Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Share Document</h2>
        {canShare ? (
          <div>
            <p className="text-gray-600 mb-4">Shared with: {document.sharedWith?.length || 0} users</p>
            {document.sharedWith?.length > 0 && (
              <ul className="space-y-2">
                {document.sharedWith.map((user) => (
                  <li key={user._id} className="text-sm text-gray-700">
                    {user.name} ({user.email})
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-700">Document sharing is available on Pro and Enterprise plans.</p>
            <Link to="/plans" className="text-blue-600 hover:underline mt-2 inline-block">Upgrade to unlock sharing →</Link>
          </div>
        )}
      </div>

      {/* Version History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Version History</h2>
        {canVersion ? (
          <div>
            <p className="text-gray-600 mb-4">Current Version: {document.currentVersion}</p>
            {document.versions?.length > 0 && (
              <ul className="space-y-2">
                {document.versions.map((version) => (
                  <li key={version.versionNumber} className="text-sm text-gray-700 border-b pb-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Version {version.versionNumber}</span>
                      <span>{new Date(version.uploadedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-gray-500">{version.fileName} - {(version.fileSize / 1024).toFixed(2)} KB</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-700">Version control is available on Pro and Enterprise plans.</p>
            <Link to="/plans" className="text-blue-600 hover:underline mt-2 inline-block">Upgrade to unlock versioning →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
