import { createContext, useContext, useState, useEffect } from 'react';
import api from '../middleware/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const loadUser = async () => {
    try {
      // First, always check if the platform is setup (empty database check)
      const setupRes = await api.get('/auth/check-setup');
      setNeedsSetup(setupRes.data.needsSetup);

      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // If token exists, fetch user profile
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setOrganization(data.organization);
    } catch {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUser(); }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setOrganization(data.organization);
    return data;
  };

  const register = async (userData) => {
    const { data } = await api.post('/auth/register', userData);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setOrganization(data.organization);
    return data;
  };

  const setupPlatform = async (userData) => {
    const { data } = await api.post('/auth/setup', userData);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setOrganization(data.organization);
    setNeedsSetup(false);
    return data;
  }

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setOrganization(null);
  };

  return (
    <AuthContext.Provider value={{ user, organization, loading, needsSetup, login, register, setupPlatform, logout, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
