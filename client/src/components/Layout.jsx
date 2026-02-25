import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { Layers, LayoutGrid, Home, FileText, Search, Lock, Settings, CreditCard, LogOut } from 'lucide-react';

// Helper for contrast
const getContrastYIQ = (hexcolor) => {
  if (!hexcolor) return '#ffffff';
  const hex = hexcolor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
};

export default function Layout() {
  const { user, organization, logout } = useAuth();
  const { subscription } = useSubscription();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin';
  const isMember = user?.role === 'member';

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 z-10 shadow-sm">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 text-blue-600">
            <Layers className="w-6 h-6" />
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              DocsVault
            </h1>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3 mt-4">Menu</div>

          {/* Super Admin Navigation */}
          {isSuperAdmin && (
            <Link to="/plans" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:text-blue-700 hover:bg-blue-50 transition-colors">
              <LayoutGrid className="w-5 h-5 mr-3 text-gray-400" />
              Manage Plans
            </Link>
          )}

          {/* Tenant Navigation (Admin & Member) */}
          {!isSuperAdmin && (
            <>
              <Link to="/dashboard" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:text-blue-700 hover:bg-blue-50 transition-colors">
                <Home className="w-5 h-5 mr-3 text-gray-400" />
                Dashboard
              </Link>
              <Link to="/documents" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:text-blue-700 hover:bg-blue-50 transition-colors">
                <FileText className="w-5 h-5 mr-3 text-gray-400" />
                Documents
              </Link>
              <Link to="/search" className="flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:text-blue-700 hover:bg-blue-50 transition-colors">
                <div className="flex items-center">
                  <Search className="w-5 h-5 mr-3 text-gray-400" />
                  Search
                </div>
                {subscription && !subscription?.plan?.features?.includes('advanced_search') && (
                  <Lock className="w-4 h-4 text-amber-500" title="Requires Upgrade" />
                )}
              </Link>
            </>
          )}

          {/* Org Admin Only */}
          {isAdmin && (
            <>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3 mt-8">Admin</div>
              <Link to="/settings" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:text-blue-700 hover:bg-blue-50 transition-colors">
                <Settings className="w-5 h-5 mr-3 text-gray-400" />
                Organization Settings
              </Link>
              <Link to="/plans" className="flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:text-blue-700 hover:bg-blue-50 transition-colors">
                <CreditCard className="w-5 h-5 mr-3 text-gray-400" />
                Billing & Plans
              </Link>
            </>
          )}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-inner">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button onClick={handleLogout} className="ml-2 text-gray-400 hover:text-gray-600" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10 flex items-center justify-between px-8">
          <div>
            {!isSuperAdmin && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-800 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                  {organization?.name}
                </span>
                {subscription && (
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full border shadow-sm"
                    style={{
                      backgroundColor: subscription.plan.color || '#3b82f6',
                      borderColor: subscription.plan.color || '#3b82f6',
                      color: getContrastYIQ(subscription.plan.color || '#3b82f6')
                    }}
                  >
                    {subscription.plan.name}
                  </span>
                )}
              </div>
            )}
            {isSuperAdmin && (
              <span className="text-sm font-semibold text-purple-800 bg-purple-100 px-3 py-1 rounded-full border border-purple-200">
                System Administrator
              </span>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
