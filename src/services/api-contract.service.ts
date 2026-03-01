type AnyRecord = Record<string, any>;

const isObject = (value: unknown): value is AnyRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const getApiMessage = (payload: unknown): string | undefined => {
  if (!isObject(payload)) return undefined;
  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }
  return undefined;
};

export const getApiPayload = <T = any>(payload: unknown): T => {
  if (!isObject(payload)) return payload as T;
  // Standard wrapper { message, data }
  if ("data" in payload) return payload.data as T;
  // Exception wrapper { success, data }
  if ("success" in payload && "data" in payload) return payload.data as T;
  return payload as T;
};

export const getApiList = <T = any>(payload: unknown): T[] => {
  const extracted = getApiPayload<any>(payload);
  if (Array.isArray(extracted)) return extracted as T[];
  if (isObject(extracted) && Array.isArray(extracted.items)) return extracted.items as T[];
  return [];
};

