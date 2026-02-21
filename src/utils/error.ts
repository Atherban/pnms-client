import type { ApiError } from "../types/api.types";

const parseJsonSafe = (value: unknown): any => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
};

const toMessageString = (value: unknown): string | undefined => {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
};

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

const getPayloadMessage = (payload: any): string | undefined => {
  if (!payload || typeof payload !== "object") return undefined;

  const direct = toMessageString(payload.message);
  if (direct) return direct;

  const errorMessage = toMessageString(payload.error?.message);
  if (errorMessage) return errorMessage;

  const errorAsString = toMessageString(payload.error);
  if (errorAsString) return errorAsString;

  const detail = toMessageString(payload.detail ?? payload.title);
  if (detail) return detail;

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    const firstError = payload.errors[0];
    if (typeof firstError === "string") return firstError;
    const nested = toMessageString(firstError?.message);
    if (nested) return nested;
  }

  return undefined;
};

const hasFileTooLargeError = (
  status: number | undefined,
  code: unknown,
  message: string | undefined,
) => {
  if (status === 413) return true;

  const codeText = String(code ?? "").toLowerCase();
  if (codeText.includes("limit_file_size") || codeText.includes("payload_too_large")) {
    return true;
  }

  const msg = String(message ?? "").toLowerCase();
  return (
    msg.includes("file too large") ||
    msg.includes("payload too large") ||
    msg.includes("request entity too large") ||
    msg.includes("exceeds the allowed size")
  );
};

export const normalizeError = (error: any): ApiError => {
  const status = Number(error?.status ?? error?.response?.status ?? 0) || undefined;
  const responsePayload = error?.response?.data;
  const parsedMessagePayload = parseJsonSafe(error?.message);
  const payload =
    responsePayload && typeof responsePayload === "object"
      ? responsePayload
      : parsedMessagePayload && typeof parsedMessagePayload === "object"
        ? parsedMessagePayload
        : {};
  const payloadMessage = getPayloadMessage(payload);
  const rawMessage = toMessageString(error?.message);
  const message = hasFileTooLargeError(status, error?.code, payloadMessage || rawMessage)
    ? "File too large. Please upload a smaller image."
    : payloadMessage || rawMessage || "Something went wrong";

  const details =
    toDetailArray(
      payload?.details ??
        payload?.error?.details ??
        payload?.errors ??
        error?.details,
    ) ?? undefined;

  return {
    code: error?.code ?? status ?? "UNKNOWN",
    status,
    message,
    details,
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
