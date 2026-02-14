import type { ApiError } from "../types/api.types";

const toDetailArray = (details: unknown): string[] | undefined => {
  if (!details) return undefined;
  if (Array.isArray(details)) {
    const normalized = details
      .map((entry) =>
        typeof entry === "string"
          ? entry
          : typeof entry === "object" && entry && "message" in entry
            ? String((entry as { message: unknown }).message)
            : String(entry),
      )
      .filter(Boolean);
    return normalized.length > 0 ? normalized : undefined;
  }
  if (typeof details === "string") return [details];
  return [String(details)];
};

export const normalizeError = (error: any): ApiError => {
  const status = Number(error?.status ?? error?.response?.status ?? 0) || undefined;
  const payload = error?.response?.data ?? {};
  return {
    code: error?.code ?? status ?? "UNKNOWN",
    status,
    message:
      error?.message ??
      payload?.message ??
      payload?.error?.message ??
      "Something went wrong",
    details: toDetailArray(payload?.details ?? error?.details),
  };
};

export const formatErrorMessage = (error: any) => {
  const normalized = normalizeError(error);
  if (!normalized.details?.length) return normalized.message;
  return `${normalized.message}\n\n${normalized.details.map((d) => `• ${d}`).join("\n")}`;
};

export const isUnauthorizedError = (error: any) =>
  Number(error?.status ?? error?.code ?? error?.response?.status) === 401;

export const isForbiddenError = (error: any) =>
  Number(error?.status ?? error?.code ?? error?.response?.status) === 403;
