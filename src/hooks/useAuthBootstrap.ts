import { useEffect, useState } from "react";
import { useAuthStore } from "../stores/auth.store";
import { decodeToken, isTokenExpired } from "../utils/jwt";
import { getToken } from "../utils/storage";

export const useAuthBootstrap = () => {
  const [loading, setLoading] = useState(true);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    const init = async () => {
      const token = await getToken();

      if (!token || isTokenExpired(token)) {
        clearAuth();
        setLoading(false);
        return;
      }

      const decoded = decodeToken(token);

      setAuth({ id: decoded.userId, role: decoded.role }, token);

      setLoading(false);
    };

    init();
  }, []);

  return { loading };
};
