import { ENV } from "../constants/env";

const getApiOrigin = () => {
  const base = (ENV.API_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!base) return "";
  return base.replace(/\/api$/, "");
};

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);
const isDataOrLocalUri = (value: string) =>
  /^(data:|blob:|file:)/i.test(value);

const normalizePathSlashes = (value: string) => {
  const withForwardSlashes = value.replace(/\\/g, "/");
  return withForwardSlashes.replace(/([^:]\/)\/+/g, "$1");
};

const extractStringCandidate = (value: any): string | undefined => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return undefined;

  const nestedCandidates = [
    value.url,
    value.path,
    value.fileUrl,
    value.fileName,
    value.imageUrl,
    value.imagePath,
    value.secure_url,
    value.src,
  ];
  for (const candidate of nestedCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return undefined;
};

export const toImageUrl = (value?: string | null): string | undefined => {
  if (!value || typeof value !== "string") return undefined;
  const normalized = normalizePathSlashes(value.trim().replace(/^\.\//, ""));
  if (!normalized) return undefined;
  if (isAbsoluteUrl(normalized)) return normalized;
  if (isDataOrLocalUri(normalized)) return normalized;
  if (normalized.startsWith("//")) return `https:${normalized}`;

  const origin = getApiOrigin();
  if (!origin) return normalized;
  if (normalized.startsWith("/")) return `${origin}${normalized}`;
  if (
    normalized.startsWith("uploads/") ||
    normalized.startsWith("upload/") ||
    normalized.startsWith("api/")
  ) {
    return `${origin}/${normalized}`;
  }
  return `${origin}/uploads/${normalized}`;
};

const getImageCandidate = (entity: any): string | undefined => {
  if (!entity || typeof entity !== "object") return undefined;

  const directCandidates = [
    entity.imageUrl,
    entity.image,
    entity.thumbnail,
    entity.fileUrl,
    entity.url,
    entity.path,
    entity.fileName,
    entity.avatar,
    entity.photo,
    entity.imagePath,
    entity.secure_url,
    entity.src,
  ];

  for (const candidate of directCandidates) {
    const direct = toImageUrl(extractStringCandidate(candidate) ?? null);
    if (direct) return direct;
  }

  const images = Array.isArray(entity.images) ? entity.images : [];
  for (const image of images) {
    const fromImage = toImageUrl(extractStringCandidate(image) ?? null);
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
