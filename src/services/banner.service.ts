import { Platform } from "react-native";
import { ENV } from "../constants/env";
import { normalizeError } from "../utils/error";
import { toImageUrl } from "../utils/image";
import { getToken } from "../utils/storage";
import { getAccessScope, withScopedParams } from "./access-scope.service";
import { api, apiPath, unwrap } from "./api";

type BannerStatus = "ACTIVE" | "INACTIVE" | "DRAFT" | "EXPIRED" | string;
type BannerScope = "GLOBAL_SUPER_ADMIN" | "NURSERY_ADMIN" | string;

export interface BannerImageMeta {
  fileName?: string;
  uploadedAt?: string;
  url?: string;
}

export interface BannerItem {
  id: string;
  title: string;
  subtitle?: string;
  cta?: string;
  color?: string;
  priority?: number;
  status?: BannerStatus;
  scope?: BannerScope;
  imageUrl?: string;
  image?: BannerImageMeta;
  nurseryId?: string;
  redirectUrl?: string;
  startAt?: string;
  endAt?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface BannerPayload {
  title: string;
  subtitle?: string;
  cta?: string;
  color?: string;
  priority?: number;
  status?: BannerStatus;
  scope?: BannerScope;
  imageUrl?: string;
  nurseryId?: string;
  redirectUrl?: string;
  startAt?: string;
  endAt?: string;
}

const resolveBannerImage = (item: any) => {
  const image = item?.image;
  const fileName =
    typeof image?.fileName === "string" ? image.fileName : undefined;
  const candidate =
    item?.imageUrl ||
    image?.url ||
    image?.fileUrl ||
    image?.path ||
    fileName ||
    item?.fileName;
  const imageUrl =
    typeof candidate === "string" ? toImageUrl(candidate) : undefined;
  return {
    imageUrl,
    image:
      image && typeof image === "object"
        ? {
            fileName,
            uploadedAt:
              typeof image.uploadedAt === "string"
                ? image.uploadedAt
                : undefined,
            url: typeof image?.url === "string" ? image.url : undefined,
          }
        : undefined,
  };
};

const normalize = (item: any): BannerItem => ({
  ...resolveBannerImage(item),
  id: String(item?._id || item?.id || ""),
  title: item?.title || "",
  subtitle: item?.subtitle || item?.description || item?.message || "",
  cta: item?.cta,
  color: item?.color || "#0EA5E9",
  priority: Number(item?.priority ?? 0),
  status: fromApiStatus(item?.status),
  scope: item?.scope,
  nurseryId: item?.nurseryId,
  redirectUrl: item?.redirectUrl ? String(item.redirectUrl) : undefined,
  startAt: item?.startAt,
  endAt: item?.endAt,
  createdAt: item?.createdAt,
  updatedAt: item?.updatedAt,
  createdBy: item?.createdBy,
});

const normalizeUri = (uri: string) =>
  Platform.OS === "ios" ? uri.replace("file://", "") : uri;

const fromApiStatus = (status?: string) => {
  if (status === "EXPIRED") return "INACTIVE";
  return status || "ACTIVE";
};

const toApiStatus = (status?: string) =>
  status === "INACTIVE" ? "INACTIVE" : status;

const baseUrl = () => (ENV.API_BASE_URL || "").replace(/\/+$/, "");
const apiBase = () =>
  baseUrl().endsWith("/api") ? baseUrl() : `${baseUrl()}/api`;

const uploadWithMultipart = async (
  path: string,
  method: "POST" | "PATCH",
  payload: BannerPayload,
  file?: { uri: string; name: string; type?: string },
) => {
  const token = await getToken();
  const scope = getAccessScope();
  const formData = new FormData();
  formData.append("title", payload.title || "");
  if (payload.subtitle) formData.append("subtitle", payload.subtitle);
  if (payload.cta) formData.append("cta", payload.cta);
  if (payload.color) formData.append("color", payload.color);
  if (payload.priority !== undefined)
    formData.append("priority", String(payload.priority));
  if (payload.status) {
    const statusForApi = toApiStatus(payload.status);
    if (statusForApi) formData.append("status", statusForApi);
  }
  if (payload.scope) formData.append("scope", payload.scope);
  if (payload.nurseryId) formData.append("nurseryId", payload.nurseryId);
  if (payload.redirectUrl) formData.append("redirectUrl", payload.redirectUrl);
  if (payload.startAt) formData.append("startAt", payload.startAt);
  if (payload.endAt) formData.append("endAt", payload.endAt);
  if (payload.imageUrl && !/^file:/i.test(payload.imageUrl)) {
    formData.append("imageUrl", payload.imageUrl);
  }

  if (file?.uri) {
    formData.append("image", {
      uri: normalizeUri(file.uri),
      name: file.name || "banner.jpg",
      type: file.type || "image/jpeg",
    } as any);
  }

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (scope.role) headers["x-user-role"] = scope.role;
  if (scope.userId) headers["x-user-id"] = scope.userId;
  if (scope.nurseryId) headers["x-nursery-id"] = scope.nurseryId;

  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers,
    body: formData,
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
      message:
        typeof json?.message === "string"
          ? json.message
          : rawText || "Request failed",
      details: json?.details,
      response: { status: res.status, data: json ?? rawText },
    });
  }

  return normalize((json?.data ?? json) || {});
};

const toScopedPayload = <T extends BannerPayload | Partial<BannerItem>>(
  payload: T,
): T => {
  const mappedStatus = toApiStatus(payload.status);
  const access = getAccessScope();
  if (access.role === "SUPER_ADMIN") {
    return {
      ...payload,
      ...(mappedStatus ? { status: mappedStatus } : {}),
      scope: payload.scope || "GLOBAL_SUPER_ADMIN",
    };
  }
  return {
    ...payload,
    ...(mappedStatus ? { status: mappedStatus } : {}),
    scope: payload.scope || "NURSERY_ADMIN",
    nurseryId: payload.nurseryId || access.nurseryId,
  };
};

export const BannerService = {
  async list(params?: { status?: string; nurseryId?: string; scope?: string }) {
    const scope = getAccessScope();
    const scopedParams = withScopedParams(params);
    if (scope.role !== "SUPER_ADMIN") {
      if (!scopedParams.scope) scopedParams.scope = "NURSERY_ADMIN";
    }
    const res = await api.get(apiPath("/banners"), { params: scopedParams });
    const data = unwrap<any>(res);
    const list = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data)
        ? data
        : [];
    return list.map(normalize);
  },

  async listCustomerBanners(): Promise<BannerItem[]> {
    try {
      const scope = getAccessScope();
      const nowTs = Date.now();
      const banners = await this.list({
        status: "ACTIVE",
        nurseryId: scope.nurseryId,
      });
      return banners
        .filter((item: BannerItem) => {
          if (item.status && item.status !== "ACTIVE") return false;
          if (item.startAt && Number.isFinite(Date.parse(item.startAt))) {
            if (Date.parse(item.startAt) > nowTs) return false;
          }
          if (item.endAt && Number.isFinite(Date.parse(item.endAt))) {
            if (Date.parse(item.endAt) < nowTs) return false;
          }
          if (item.scope === "GLOBAL_SUPER_ADMIN") return true;
          if (!scope.nurseryId) return true;
          return !item.nurseryId || item.nurseryId === scope.nurseryId;
        })
        .sort((a: BannerItem, b: BannerItem) => {
          const scopeWeightA = a.scope === "GLOBAL_SUPER_ADMIN" ? 1 : 0;
          const scopeWeightB = b.scope === "GLOBAL_SUPER_ADMIN" ? 1 : 0;
          if (scopeWeightA !== scopeWeightB) return scopeWeightB - scopeWeightA;
          const aPriority = Number(a.priority ?? 0);
          const bPriority = Number(b.priority ?? 0);
          return bPriority - aPriority;
        });
    } catch {
      return [];
    }
  },

  async create(payload: BannerPayload) {
    const normalizedPayload = toScopedPayload(payload);
    const res = await api.post(apiPath("/banners"), normalizedPayload);
    const data = unwrap<any>(res);
    return normalize(data?.data ?? data);
  },

  async createWithImage(
    payload: BannerPayload,
    file?: { uri: string; name: string; type?: string },
  ) {
    const normalizedPayload = toScopedPayload(payload);
    if (!file?.uri) return this.create(normalizedPayload);
    return uploadWithMultipart("/banners", "POST", normalizedPayload, file);
  },

  async update(id: string, payload: Partial<BannerItem>) {
    const normalizedPayload = toScopedPayload(payload);
    const res = await api.patch(apiPath(`/banners/${id}`), normalizedPayload);
    const data = unwrap<any>(res);
    return normalize(data?.data ?? data);
  },

  async updateWithImage(
    id: string,
    payload: BannerPayload,
    file?: { uri: string; name: string; type?: string },
  ) {
    const normalizedPayload = toScopedPayload(payload);
    if (!file?.uri) return this.update(id, normalizedPayload);
    return uploadWithMultipart(
      `/banners/${id}`,
      "PATCH",
      normalizedPayload,
      file,
    );
  },

  async remove(id: string) {
    const res = await api.delete(apiPath(`/banners/${id}`));
    return unwrap<any>(res);
  },
};
