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
import { getApiMessage, getApiPayload } from "./api-contract.service";
import { PushNotificationService } from "./push-notification.service";

/* Types */
export interface LoginPayload {
  email?: string;
  phoneNumber?: string;
  password: string;
}

export interface AuthUser {
  _id: string;
  name: string;
  email?: string;
  role: "NURSERY_ADMIN" | "STAFF" | "CUSTOMER" | "SUPER_ADMIN";
  phoneNumber?: string;
  nurseryId?: string;
  allowedNurseryIds?: string[];
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface RequestOtpResponse {
  otpSessionId?: string;
  expiresInSec?: number;
  otpCode?: string;
  message?: string;
}

export const AuthService = {
  normalizeAuthResponse(payload: any): LoginResponse {
    const normalized = getApiPayload<any>(payload);
    if (!normalized?.token || !normalized?.user) {
      throw new Error("Invalid login response");
    }
    return {
      token: normalized.token,
      user: normalized.user,
    };
  },

  /* Login */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    if (!payload.email?.trim() && !payload.phoneNumber?.trim()) {
      throw new Error("Email or phone is required");
    }
    const response = await api.post(apiPath("/auth/login"), payload);
    const data = unwrap<any>(response);
    const { token, user } = this.normalizeAuthResponse(data);
    
    // Save both token AND user to SecureStore
    await saveToken(token);
    await saveUser(user);
    
    return { token, user };
  },

  async requestOtp(phoneNumber: string): Promise<RequestOtpResponse> {
    const response = await api.post(apiPath("/auth/request-otp"), { phoneNumber });
    const data = unwrap<any>(response);
    const payload = getApiPayload<any>(data);
    return {
      otpSessionId: payload?.otpSessionId,
      expiresInSec: payload?.expiresInSec,
      otpCode: payload?.otpCode,
      message: payload?.message ?? getApiMessage(data),
    };
  },

  async verifyOtp(payload: {
    phoneNumber: string;
    code?: string;
    otp?: string;
    otpSessionId?: string;
  }): Promise<LoginResponse> {
    const response = await api.post(apiPath("/auth/verify-otp"), {
      phoneNumber: payload.phoneNumber,
      code: payload.code ?? payload.otp,
      otpSessionId: payload.otpSessionId,
    });
    const data = unwrap<any>(response);
    const normalized = this.normalizeAuthResponse(data);
    await saveToken(normalized.token);
    await saveUser(normalized.user);
    return normalized;
  },

  async forgotPassword(payload: { email?: string; phoneNumber?: string }) {
    const response = await api.post(apiPath("/auth/forgot-password"), payload);
    return unwrap<any>(response);
  },

  async resetPassword(payload: {
    token?: string;
    phoneNumber?: string;
    otp?: string;
    newPassword: string;
  }) {
    const response = await api.post(apiPath("/auth/reset-password"), payload);
    return unwrap<any>(response);
  },

  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }) {
    const response = await api.post(apiPath("/auth/change-password"), payload);
    return unwrap<any>(response);
  },

  /* Logout */
  async logout(): Promise<void> {
    try {
      // Optional: backend logout endpoint
      // await api.post("/auth/logout");
    } finally {
      PushNotificationService.resetRegistrationState();
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
    return getApiPayload<AuthUser>(unwrap<any>(response));
  },

  /* Check if user is authenticated */
  async isAuthenticated(): Promise<boolean> {
    const token = await getToken();
    return !!token;
  },
};
