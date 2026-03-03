// stores/auth.store.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Role } from "../types/role.types";
import { normalizeRole } from "../utils/role";
import { getToken, getUser } from "../utils/storage";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  phoneNumber?: string;
  nurseryId?: string;
  allowedNurseryIds?: string[];
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  updateUser: (userData: Partial<AuthUser>) => void;
  setLoading: (loading: boolean) => void;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user, token) =>
        set({
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: normalizeRole(user.role),
            phoneNumber: user.phoneNumber,
            nurseryId: user.nurseryId,
            allowedNurseryIds: user.allowedNurseryIds,
          },
          token,
          isAuthenticated: true,
          isLoading: false,
        }),

      clearAuth: () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { PushNotificationService } = require("../services/push-notification.service");
          PushNotificationService.resetRegistrationState();
        } catch {
          // Push module may not be available in all environments.
        }
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),

      setLoading: (loading) => set({ isLoading: loading }),

      loadFromStorage: async () => {
        set({ isLoading: true });
        try {
          // Load token and user from SecureStore
          const token = await getToken();
          const userData = await getUser();

          if (token && userData) {
            // Transform API user format to app format
            const user: AuthUser = {
              id: userData._id || userData.id,
              name: userData.name,
              email: userData.email || "",
              role: normalizeRole(userData.role),
              phoneNumber: userData.phoneNumber || userData.phone,
              nurseryId: userData.nurseryId,
              allowedNurseryIds: userData.allowedNurseryIds,
            };

            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          console.error("Error loading auth from storage:", error);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // We're using SecureStore for sensitive data
        // AsyncStorage only stores non-sensitive metadata
      }),
      onRehydrateStorage: () => {
        return (state) => {
          // Load from SecureStore when store rehydrates
          state?.loadFromStorage();
        };
      },
    },
  ),
);
