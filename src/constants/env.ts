const rawApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

if (!rawApiBaseUrl) {
  throw new Error(
    "Missing EXPO_PUBLIC_API_BASE_URL. Set it in your .env before starting the app.",
  );
}

export const ENV = {
  API_BASE_URL: rawApiBaseUrl.replace(/\/+$/, ""),
};
