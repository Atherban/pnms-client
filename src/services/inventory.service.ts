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

const normalizeInventoryItem = (item: any): Inventory => {
  const normalized = withResolvedImagesDeep(item);
  return {
    ...normalized,
    _id: normalized?._id ?? normalized?.id ?? "",
    quantity: Number.isFinite(Number(normalized?.quantity))
      ? Number(normalized.quantity)
      : 0,
    unitCost: Number.isFinite(Number(normalized?.unitCost))
      ? Number(normalized.unitCost)
      : Number.isFinite(Number(normalized?.costPrice))
        ? Number(normalized.costPrice)
        : Number.isFinite(Number(normalized?.purchasePrice))
          ? Number(normalized.purchasePrice)
          : normalized?.unitCost,
    unitPrice: Number.isFinite(Number(normalized?.unitPrice))
      ? Number(normalized.unitPrice)
      : Number.isFinite(Number(normalized?.sellingPrice))
        ? Number(normalized.sellingPrice)
        : normalized?.unitPrice,
  };
};

export const InventoryService = {
  async getAll(): Promise<Inventory[]> {
    const res = await api.get(apiPath("/inventory"));
    return normalizeList(unwrap(res)).map(normalizeInventoryItem);
  },

  async getById(id: string): Promise<Inventory> {
    const res = await api.get(apiPath(`/inventory/${id}`));
    const data = unwrap(res);
    return normalizeInventoryItem(data?.data ?? data);
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
