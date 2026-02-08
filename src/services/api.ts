import axios from "axios";
import { ENV } from "../constants/env";
import { getToken, removeToken } from "../utils/storage";

export const api = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 15000,
});


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

    if (status === 401) {
      await removeToken();
    }

    return Promise.reject({
      code: status ?? "UNKNOWN",
      message: error.response?.data?.message || "Unexpected error",
    });
  },
);
