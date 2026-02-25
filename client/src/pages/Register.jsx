import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';

export default function Register() {
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'join'
  const [form, setForm] = useState({ name: '', email: '', password: '', orgName: '', inviteCode: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      name: form.name,
      email: form.email,
      password: form.password,
    };

    if (activeTab === 'create') {
      if (!form.orgName) {
        setError('Organization name is required');
        setLoading(false);
        return;
      }
      payload.orgName = form.orgName;
    } else {
      if (!form.inviteCode) {
        setError('Invite code is required');
        setLoading(false);
        return;
      }
      payload.inviteCode = form.inviteCode;
    }

    try {
      await register(payload);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          <button
            className={`flex-1 py-4 text-sm font-semibold tracking-wide transition-colors ${activeTab === 'create' ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'}`}
            onClick={() => { setActiveTab('create'); setError(''); }}
          >
            Create Organization
          </button>
          <button
            className={`flex-1 py-4 text-sm font-semibold tracking-wide transition-colors ${activeTab === 'join' ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'}`}
            onClick={() => { setActiveTab('join'); setError(''); }}
          >
            Join Organization
          </button>
        </div>

        <div className="p-8 pb-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {activeTab === 'create' ? 'Start your workspace' : 'Join your team'}
            </h2>
            <p className="text-gray-500 mt-1.5 text-sm">
              {activeTab === 'create' ? 'Create an account and setup your organization.' : 'Enter your invite code to join an existing workspace.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'create' ? (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Organization Name</label>
                <input type="text" name="orgName" value={form.orgName} onChange={handleChange} required={activeTab === 'create'}
                  placeholder="Acme Corp"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Invite Code</label>
                <input type="text" name="inviteCode" value={form.inviteCode} onChange={handleChange} required={activeTab === 'join'}
                  placeholder="A1B2C3D4"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase tracking-widest font-mono text-center text-lg" />
              </div>
            )}

            <div className="pt-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Full Name</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} required
                placeholder="Jane Doe"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required
                placeholder="jane@company.com"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={6}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mt-6">
              {loading ? 'Processing...' : (activeTab === 'create' ? 'Create Account' : 'Join Organization')}
            </button>
          </form>

          <p className="text-center mt-8 text-sm text-gray-600">
            Already have an account? <Link to="/login" className="text-blue-600 font-semibold hover:underline">Sign In here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
