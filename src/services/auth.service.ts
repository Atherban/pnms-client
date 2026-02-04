// services/auth.service.ts
import { saveToken, getToken, removeToken, saveUser, getUser, removeUser } from "../utils/storage";
import { api } from "./api";

/* Types */
export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF" | "VIEWER";
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const AuthService = {
  /* Login */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const response = await api.post("/auth/login", payload);

    if (!response || !response.data.token || !response.data.user) {
      throw new Error("Invalid login response");
    }

    const { token, user } = response.data;
    
    // Save both token AND user to SecureStore
    await saveToken(token);
    await saveUser(user);
    
    return response.data;
  },

  /* Logout */
  async logout(): Promise<void> {
    try {
      // Optional: backend logout endpoint
      // await api.post("/auth/logout");
    } finally {
      // Clear both token and user from storage
      await removeToken();
      await removeUser();
    }
  },

  /* Get Current User from Storage */
  async getCurrentUser(): Promise<AuthUser | null> {
    return await getUser();
  },

  /* Check if user is authenticated */
  async isAuthenticated(): Promise<boolean> {
    const token = await getToken();
    return !!token;
  },
};