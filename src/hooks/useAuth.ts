import { useState, useEffect } from 'react';
import { apiService, User } from '@/lib/api';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (apiService.isAuthenticated()) {
          const userData = await apiService.fetchCurrentUser();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        apiService.logout();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = () => {
    apiService.logout();
    setUser(null);
    router.push('/');
  };

  return { user, loading, logout, isAuthenticated: apiService.isAuthenticated() && !!user };
};
