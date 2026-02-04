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



export const UploadService = {
  async uploadPlantImage(plantId: string, file: UploadFile) {
    const token = await getToken();

    const formData = new FormData();
    formData.append("image", {
      uri: normalizeUri(file.uri),
      name: file.name || "image.jpg",
      type: file.type || "image/jpeg",
    } as any);

    const res = await fetch(`${ENV.API_BASE_URL}/plants/${plantId}/image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // ❗ DO NOT set Content-Type manually
      },
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Upload failed");
    }

    return true;
  },

  async uploadSeedImage(seedId: string, file: UploadFile) {
    const token = await getToken();

    const formData = new FormData();
    formData.append("image", {
      uri: normalizeUri(file.uri),
      name: file.name || "image.jpg",
      type: file.type || "image/jpeg",
    } as any);

    const res = await fetch(`${ENV.API_BASE_URL}/seeds/${seedId}/image`, {
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
  },
};
