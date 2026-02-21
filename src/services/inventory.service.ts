import { api, apiPath, unwrap } from "./api";
import type {
  CreatePurchasedInventoryPayload,
  Inventory,
} from "../types/inventory.types";
import { withResolvedImagesDeep } from "../utils/image";

const normalizeList = (data: any) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

export const InventoryService = {
  async getAll(): Promise<Inventory[]> {
    const res = await api.get(apiPath("/inventory"));
    return withResolvedImagesDeep(normalizeList(unwrap(res)));
  },

  async getById(id: string): Promise<Inventory> {
    const res = await api.get(apiPath(`/inventory/${id}`));
    const data = unwrap(res);
    return withResolvedImagesDeep(data?.data ?? data);
  },

  async create(payload: { plantType: string; quantity?: number; minStockLevel?: number }) {
    const res = await api.post(apiPath("/inventory"), payload);
    return unwrap(res);
  },

  async createPurchased(payload: CreatePurchasedInventoryPayload) {
    const res = await api.post(apiPath("/inventory"), {
      ...payload,
      sourceType: payload.sourceType ?? "PURCHASE",
    });
    return unwrap(res);
  },
};
