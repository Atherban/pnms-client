export const formatDate = (date: string) => new Date(date).toLocaleDateString();

export const formatUnknown = (value: unknown, fallback = "—"): string => {
  if (value === null || value === undefined) return fallback;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    const text = String(value).trim();
    return text.length ? text : fallback;
  }

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => formatUnknown(entry, ""))
      .filter((entry) => entry.length > 0);
    return parts.length ? parts.join(", ") : fallback;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidate = record._id ?? record.id ?? record.code ?? record.name ?? record.ref;

    if (
      candidate !== null &&
      candidate !== undefined &&
      typeof candidate !== "object"
    ) {
      return String(candidate);
    }

    try {
      const serialized = JSON.stringify(value);
      if (!serialized || serialized === "{}" || serialized === "[]") return fallback;
      return serialized.length > 80 ? `${serialized.slice(0, 77)}...` : serialized;
    } catch {
      return fallback;
    }
  }

  return fallback;
};
