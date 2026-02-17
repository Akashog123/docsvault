import { createContext, useContext, useState, useEffect } from 'react';
import api from '../middleware/api';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSubscription = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/subscription');
      setSubscription(data.subscription);
      setUsage(data.usage);
    } catch {
      setSubscription(null);
      setUsage(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSubscription(); }, [user]);

  return (
    <SubscriptionContext.Provider value={{ subscription, usage, loading, refreshSubscription: loadSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);
