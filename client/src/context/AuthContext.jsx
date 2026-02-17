import { createContext, useContext, useState, useEffect } from 'react';
import api from '../middleware/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
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

  const register = async (name, email, password, orgName) => {
    const { data } = await api.post('/auth/register', { name, email, password, orgName });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setOrganization(data.organization);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setOrganization(null);
  };

  return (
    <AuthContext.Provider value={{ user, organization, loading, login, register, logout, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
