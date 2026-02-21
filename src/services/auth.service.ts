// services/auth.service.ts
import {
  getToken,
  getUser,
  removeToken,
  removeUser,
  saveToken,
  saveUser,
} from "../utils/storage";
import { api, apiPath, unwrap } from "./api";

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
    const response = await api.post(apiPath("/auth/login"), payload);
    const data = unwrap<LoginResponse>(response);

    if (!data || !data.token || !data.user) {
      throw new Error("Invalid login response");
    }

    const { token, user } = data;
    
    // Save both token AND user to SecureStore
    await saveToken(token);
    await saveUser(user);
    
    return data;
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

  async getProfile(): Promise<AuthUser> {
    const response = await api.get(apiPath("/auth/profile"));
    const data = unwrap<any>(response);
    return data?.data ?? data?.user ?? data;
  },

  /* Check if user is authenticated */
  async isAuthenticated(): Promise<boolean> {
    const token = await getToken();
    return !!token;
  },
};
