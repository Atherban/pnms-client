import { Platform } from "react-native";
import { ENV } from "../constants/env";
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
    const text = await res.text();
    throw new Error(text || "Upload failed");
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

  // Backward compatibility (deprecated)
  async uploadPlantImage(plantId: string, file: UploadFile) {
    return uploadImage(`/plant-types/${plantId}/image`, file);
  },
};
