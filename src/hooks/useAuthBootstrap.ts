import { useEffect, useState } from "react";
import { useAuthStore } from "../stores/auth.store";
import { decodeToken, isTokenExpired } from "../utils/jwt";
import { getToken } from "../utils/storage";

export const useAuthBootstrap = () => {
  const [loading, setLoading] = useState(true);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const token = await getToken();

        if (!token || isTokenExpired(token)) {
          clearAuth();
          if (isMounted) setLoading(false);
          return;
        }

        const decoded = decodeToken(token);

        setAuth(
          {
            id: decoded.userId,
            role: decoded.role,
            name: "",
            email: "",
          },
          token,
        );
      } catch {
        clearAuth();
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void init();

    return () => {
      isMounted = false;
    };
  }, [clearAuth, setAuth]);

  return { loading };
};
