import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Setup() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setupPlatform } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await setupPlatform(form);
      navigate('/plans');
    } catch (err) {
      setError(err.response?.data?.error || 'Platform setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden border border-amber-200">
        <div className="bg-amber-600 p-6 text-center">
          <h2 className="text-2xl font-bold text-white">Platform Setup</h2>
          <p className="text-amber-100 mt-2">Initialize the super admin account</p>
        </div>

        <div className="p-8">
          <p className="text-sm text-gray-600 mb-6 text-center">
            Welcome! As the first user, you will be registered as the platform owner (Super Admin). You will not be attached to any tenant organization, but will instead manage global subscription plans.
          </p>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-amber-600 text-white py-2 rounded-md hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6 font-medium">
              {loading ? 'Initializing Platform...' : 'Initialize Platform'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
