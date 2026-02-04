// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { AuthService } from '../services/auth.service';

export const useAuth = () => {
  const { user, token, isAuthenticated, isLoading, setLoading } = useAuthStore();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      if (!user && token) {
        setLoading(true);
        try {
          // Try to fetch user profile if we have token but no user
          const profile = await AuthService.getProfile();
          useAuthStore.getState().updateUser({
            id: profile._id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
          });
        } catch (error) {
          console.log('Failed to fetch user profile');
        } finally {
          setLoading(false);
          setCheckingAuth(false);
        }
      } else {
        setCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, []);

  return {
    user,
    token,
    isAuthenticated,
    isLoading: isLoading || checkingAuth,
    userName: user?.name || null,
    userEmail: user?.email || null,
    userRole: user?.role || null,
    userInitials: user?.name?.charAt(0).toUpperCase() || 'U',
  };
};