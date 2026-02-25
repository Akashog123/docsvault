import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../middleware/api';
import { Building2, Copy, RefreshCw, Check, AlertTriangle, Users, UserPlus, X } from 'lucide-react';

export default function OrgSettings() {
  const { user, organization } = useAuth();
  const [members, setMembers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'member' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchOrgData();
    fetchInviteCode();
  }, []);

  const fetchOrgData = async () => {
    try {
      const { data } = await api.get('/org');
      setMembers(data.members);
    } catch (err) {
      setError('Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  const fetchInviteCode = async () => {
    try {
      const { data } = await api.get('/org/invite-code');
      setInviteCode(data.inviteCode);
    } catch (err) {
      console.error('Failed to load invite code');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateInviteCode = async () => {
    try {
      const { data } = await api.post('/org/invite-code');
      setInviteCode(data.inviteCode);
    } catch (err) {
      setError('Failed to generate new invite code');
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/org/users', userForm);
      setShowAddUser(false);
      setUserForm({ name: '', email: '', password: '', role: 'member' });
      fetchOrgData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add user');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500 font-medium">Loading organization data...</div>
    </div>
  );

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-100 max-w-md w-full">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only organization administrators can access these settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Organization Settings</h1>
        <p className="text-gray-500 mt-2 text-lg">Manage your team and workspace preferences.</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm" role="alert">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Details & Invite Code */}
        <div className="lg:col-span-1 space-y-8">
          {/* Org Details Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gray-400" />
                Workspace Details
              </h2>
            </div>
            <div className="p-6">
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">Organization Name</dt>
                  <dd className="text-base font-semibold text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-100">{organization?.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-1">URL Slug</dt>
                  <dd className="text-sm font-mono text-gray-700 bg-gray-50 px-3 py-2 rounded-md border border-gray-100">{organization?.slug}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Invite Code Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Copy className="w-5 h-5 text-gray-400" />
                Registration Code
              </h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                Share this code with team members. They can enter it during sign-up to automatically join your workspace.
              </p>

              <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100 mb-4">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block mb-2">Active Code</span>
                {inviteCode ? (
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-mono font-bold tracking-widest text-blue-900">{inviteCode}</span>
                    <button
                      onClick={handleCopyCode}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors relative"
                      title="Copy to clipboard"
                    >
                      {copied ? (
                        <Check className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500 italic block py-1">No code generated yet</span>
                )}
              </div>

              <button
                onClick={handleGenerateInviteCode}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {inviteCode ? 'Generate New Code' : 'Create Invite Code'}
              </button>

              {inviteCode && (
                <p className="text-xs text-amber-600 mt-3 flex items-start gap-1">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Generating a new code immediately invalidates the old one.</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Team Members */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-gray-50/50">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-400" />
                  Team Members
                </h2>
                <p className="text-sm text-gray-500 mt-1">{members.length} active users</p>
              </div>
              <button
                onClick={() => setShowAddUser(!showAddUser)}
                className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {showAddUser ? 'Cancel' : 'Invite User'}
              </button>
            </div>

            {showAddUser && (
              <div className="p-6 border-b border-gray-100 bg-blue-50/30">
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={userForm.name}
                        onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                        required
                        placeholder="Jane Doe"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={userForm.email}
                        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                        required
                        placeholder="jane@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                      <input
                        type="password"
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        required
                        minLength={6}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <select
                        value={userForm.role}
                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm bg-white"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddUser(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      Create User Account
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="flex-1 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {members.map((member) => (
                    <tr key={member._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold text-lg border border-blue-200">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{member.name}</div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          member.role === 'admin'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}>
                          {member.role === 'admin' ? 'Admin' : 'Member'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                        {new Date(member.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
