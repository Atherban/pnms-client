import { Platform } from "react-native";
import { ENV } from "../constants/env";
import { normalizeError } from "../utils/error";
import { getToken } from "../utils/storage";

interface UploadFile {
  uri: string;
  name: string;
  type?: string;
}

const normalizeUri = (uri: string) =>
  Platform.OS === "ios" ? uri.replace("file://", "") : uri;

const baseUrl = () => (ENV.API_BASE_URL || "").replace(/\/+$/, "");
const apiBase = () =>
  baseUrl().endsWith("/api") ? baseUrl() : `${baseUrl()}/api`;

const uploadImage = async (path: string, file: UploadFile) => {
  const token = await getToken();

  const formData = new FormData();
  formData.append("image", {
    uri: normalizeUri(file.uri),
    name: file.name || "image.jpg",
    type: file.type || "image/jpeg",
  } as any);

  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const rawText = await res.text();
    let payload: any = null;

    try {
      payload = rawText ? JSON.parse(rawText) : null;
    } catch {
      payload = null;
    }

    throw normalizeError({
      code: res.status,
      status: res.status,
      message: typeof payload?.message === "string" ? payload.message : rawText || "Upload failed",
      details: payload?.details ?? payload?.error?.details,
      response: {
        status: res.status,
        data: payload ?? rawText,
      },
    });
  }

  return true;
};

const deleteImage = async (path: string) => {
  const token = await getToken();

  const res = await fetch(`${apiBase()}${path}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const rawText = await res.text();
    let payload: any = null;

    try {
      payload = rawText ? JSON.parse(rawText) : null;
    } catch {
      payload = null;
    }

    throw normalizeError({
      code: res.status,
      status: res.status,
      message: typeof payload?.message === "string" ? payload.message : rawText || "Delete failed",
      details: payload?.details ?? payload?.error?.details,
      response: {
        status: res.status,
        data: payload ?? rawText,
      },
    });
  }

  return true;
};

export const UploadService = {
  async uploadPlantTypeImage(plantTypeId: string, file: UploadFile) {
    return uploadImage(`/plant-types/${plantTypeId}/image`, file);
  },

  async uploadInventoryImage(inventoryId: string, file: UploadFile) {
    return uploadImage(`/inventory/${inventoryId}/image`, file);
  },

  async uploadSeedImage(seedId: string, file: UploadFile) {
    return uploadImage(`/seeds/${seedId}/image`, file);
  },

  async deletePlantTypeImage(plantTypeId: string, imageId: string) {
    return deleteImage(
      `/plant-types/${encodeURIComponent(plantTypeId)}/image/${encodeURIComponent(imageId)}`,
    );
  },

  async deleteSeedImage(seedId: string, imageId: string) {
    return deleteImage(
      `/seeds/${encodeURIComponent(seedId)}/image/${encodeURIComponent(imageId)}`,
    );
  },

  // Backward compatibility (deprecated)
  async uploadPlantImage(plantId: string, file: UploadFile) {
    return uploadImage(`/plant-types/${plantId}/image`, file);
  },
};
