import axios from "axios";
import { ENV } from "../constants/env";
import { useAuthStore } from "../stores/auth.store";
import { getToken, removeToken, removeUser } from "../utils/storage";

export const api = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 15000,
});

const hasApiPrefix = () =>
  /\/api\/?$/.test((ENV.API_BASE_URL || "").replace(/\/+$/, ""));

export const apiPath = (path: string) => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return hasApiPrefix() ? normalized : `/api${normalized}`;
};

export const unwrap = <T = any>(res: any): T => {
  if (res && typeof res === "object" && "data" in res) {
    return (res as any).data as T;
  }
  return res as T;
};

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const status = error.response?.status;
    const payload = error.response?.data ?? {};

    if (status === 401) {
      await removeToken();
      await removeUser();
      useAuthStore.getState().clearAuth();
    }

    return Promise.reject({
      code: status ?? "UNKNOWN",
      status: status ?? undefined,
      message: payload?.message || "Unexpected error",
      details: payload?.details,
      response: error.response,
    });
  },
);
