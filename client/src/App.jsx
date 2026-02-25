import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import DocumentDetail from './pages/DocumentDetail';
import Search from './pages/Search';
import Plans from './pages/Plans';
import OrgSettings from './pages/OrgSettings';

function AuthGuard({ children, requireAuth }) {
  const { user, loading, needsSetup } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  // If platform needs setup, redirect everyone to setup
  if (needsSetup) {
    return <Navigate to="/setup" />;
  }

  // If not requiring auth (like login/register page)
  if (!requireAuth) {
    if (user) return <Navigate to="/" />; // Redirect to default if already logged in
    return children;
  }

  // Require Auth Flow
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/dashboard" />;
  return children;
}

function TenantRoute({ children }) {
  const { user } = useAuth();
  if (user?.role === 'super_admin') return <Navigate to="/plans" />;
  return children;
}

function DefaultRoute() {
  const { user } = useAuth();
  if (user?.role === 'super_admin') return <Navigate to="/plans" />;
  return <Navigate to="/dashboard" />;
}

function AppRoutes() {
  const { needsSetup, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <Routes>
      {/* Setup Route */}
      <Route
        path="/setup"
        element={needsSetup ? <Setup /> : <Navigate to="/login" />}
      />

      {/* Auth Routes */}
      <Route path="/login" element={<AuthGuard requireAuth={false}><Login /></AuthGuard>} />
      <Route path="/register" element={<AuthGuard requireAuth={false}><Register /></AuthGuard>} />

      {/* Protected Routes */}
      <Route path="/" element={<AuthGuard requireAuth={true}><Layout /></AuthGuard>}>
        <Route index element={<DefaultRoute />} />

        {/* Tenant Routes (Admin & Member) */}
        <Route path="dashboard" element={<TenantRoute><Dashboard /></TenantRoute>} />
        <Route path="documents" element={<TenantRoute><Documents /></TenantRoute>} />
        <Route path="documents/:id" element={<TenantRoute><DocumentDetail /></TenantRoute>} />
        <Route path="search" element={<TenantRoute><Search /></TenantRoute>} />

        {/* Admin Route */}
        <Route path="settings" element={<AdminRoute><OrgSettings /></AdminRoute>} />

        {/* Shared / Dual-Purpose Route */}
        <Route path="plans" element={<Plans />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
          <AppRoutes />
        </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
