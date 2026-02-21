// hooks/useAuth.ts
import { useEffect, useState } from "react";
import { AuthService } from "../services/auth.service";
import { useAuthStore } from "../stores/auth.store";

export const useAuth = () => {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setLoading = useAuthStore((s) => s.setLoading);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAuthStatus = async () => {
      if (!user && token) {
        setLoading(true);
        try {
          // Try to fetch user profile if we have token but no user.
          const profile = await AuthService.getProfile();
          updateUser({
            id: profile._id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
          });
        } catch {
          console.log("Failed to fetch user profile");
        } finally {
          if (isMounted) {
            setLoading(false);
            setCheckingAuth(false);
          }
        }
      } else {
        if (isMounted) {
          setCheckingAuth(false);
        }
      }
    };

    void checkAuthStatus();

    return () => {
      isMounted = false;
    };
  }, [setLoading, token, updateUser, user]);

  return {
    user,
    token,
    isAuthenticated,
    isLoading: isLoading || checkingAuth,
    userName: user?.name || null,
    userEmail: user?.email || null,
    userRole: user?.role || null,
    userInitials: user?.name?.charAt(0).toUpperCase() || "U",
  };
};
