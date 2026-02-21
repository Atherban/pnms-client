// utils/storage.ts
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export const saveToken = async (token: string) => {
  return SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const getToken = async (): Promise<string | null> => {
  return SecureStore.getItemAsync(TOKEN_KEY);
};

export const removeToken = async () => {
  return SecureStore.deleteItemAsync(TOKEN_KEY);
};

export const saveUser = async (user: any) => {
  return SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
};

export const getUser = async (): Promise<any | null> => {
  const userStr = await SecureStore.getItemAsync(USER_KEY);
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch {
    await SecureStore.deleteItemAsync(USER_KEY);
    return null;
  }
};

export const removeUser = async () => {
  return SecureStore.deleteItemAsync(USER_KEY);
};
