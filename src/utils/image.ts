import { ENV } from "../constants/env";

const getApiOrigin = () => {
  const base = (ENV.API_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!base) return "";
  return base.replace(/\/api$/, "");
};

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

export const toImageUrl = (value?: string | null): string | undefined => {
  if (!value || typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (isAbsoluteUrl(normalized)) return normalized;

  const origin = getApiOrigin();
  if (!origin) return normalized;
  if (normalized.startsWith("/")) return `${origin}${normalized}`;
  return `${origin}/uploads/${normalized}`;
};

const getImageCandidate = (entity: any): string | undefined => {
  if (!entity || typeof entity !== "object") return undefined;

  const direct = toImageUrl(entity.imageUrl ?? entity.image ?? entity.thumbnail);
  if (direct) return direct;

  const images = Array.isArray(entity.images) ? entity.images : [];
  for (const image of images) {
    const fromImage = toImageUrl(
      image?.url ?? image?.path ?? image?.fileUrl ?? image?.fileName,
    );
    if (fromImage) return fromImage;
  }

  return undefined;
};

export const resolveEntityImage = (entity: any): string | undefined =>
  getImageCandidate(entity);

export const withResolvedImage = <T extends Record<string, any>>(entity: T): T => {
  const imageUrl = getImageCandidate(entity);
  if (!imageUrl) return entity;
  return { ...entity, imageUrl };
};

const normalizeDeep = (value: any, depth: number): any => {
  if (depth > 8) return value;
  if (Array.isArray(value)) {
    return value.map((item) => normalizeDeep(item, depth + 1));
  }
  if (!value || typeof value !== "object") return value;

  const resolved = withResolvedImage(value);
  const out: Record<string, any> = {};
  for (const [key, nested] of Object.entries(resolved)) {
    out[key] = normalizeDeep(nested, depth + 1);
  }
  return out;
};

export const withResolvedImagesDeep = <T>(value: T): T =>
  normalizeDeep(value, 0) as T;
