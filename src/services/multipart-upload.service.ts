import { Platform } from "react-native";

import { normalizeError } from "../utils/error";
import { getToken } from "../utils/storage";
import { getAccessScope } from "./access-scope.service";
import { apiPath } from "./api";
import { ENV } from "../constants/env";

export interface MultipartFile {
  uri: string;
  name?: string;
  type?: string;
}

const baseUrl = () => (ENV.API_BASE_URL || "").replace(/\/+$/, "");
const normalizeUri = (uri: string) =>
  Platform.OS === "ios" ? uri.replace("file://", "") : uri;

const buildHeaders = async (nurseryId?: string) => {
  const token = await getToken();
  const scope = getAccessScope();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(scope.role ? { "x-user-role": scope.role } : {}),
    ...(scope.userId ? { "x-user-id": scope.userId } : {}),
    ...(nurseryId || scope.nurseryId
      ? { "x-nursery-id": nurseryId || scope.nurseryId || "" }
      : {}),
  };
};

export const appendFormFieldIfDefined = (
  formData: FormData,
  key: string,
  value: unknown,
) => {
  if (value === undefined || value === null) return;
  const stringValue = String(value).trim();
  if (!stringValue) return;
  formData.append(key, stringValue);
};

export const appendMultipartFile = (
  formData: FormData,
  key: string,
  file?: MultipartFile,
) => {
  if (!file?.uri) return;
  formData.append(key, {
    uri: normalizeUri(file.uri),
    name: file.name || `${key}_${Date.now()}.jpg`,
    type: file.type || "image/jpeg",
  } as any);
};

export const sendMultipart = async <T = any>(params: {
  path: string;
  method: "POST" | "PATCH";
  formData: FormData;
  nurseryId?: string;
}): Promise<T> => {
  const headers = await buildHeaders(params.nurseryId);
  const res = await fetch(`${baseUrl()}${apiPath(params.path)}`, {
    method: params.method,
    headers,
    body: params.formData,
  });

  const rawText = await res.text();
  let json: any = null;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw normalizeError({
      code: res.status,
      status: res.status,
      message: typeof json?.message === "string" ? json.message : rawText || "Request failed",
      details: json?.details ?? json?.errors,
      response: { status: res.status, data: json ?? rawText },
    });
  }

  return (json?.data ?? json) as T;
};
