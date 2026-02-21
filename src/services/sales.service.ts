import { api, apiPath, unwrap } from "./api";
import type { Sale } from "../types/sales.type";
import { withResolvedImagesDeep } from "../utils/image";

const normalizeList = (data: any) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

export const SalesService = {
  async getAll(): Promise<Sale[]> {
    const res = await api.get(apiPath("/sales"));
    return withResolvedImagesDeep(normalizeList(unwrap(res)));
  },

  async getById(id: string): Promise<Sale> {
    const res = await api.get(apiPath(`/sales/${id}`));
    const data = unwrap(res);
    return withResolvedImagesDeep(data?.data ?? data);
  },

  async create(payload: {
    customer?: string;
    items: {
      inventoryId: string;
      quantity: number;
      priceAtSale?: number;
    }[];
    paymentMode: "CASH" | "UPI" | "ONLINE";
  }) {
    const res = await api.post(apiPath("/sales"), payload);
    return unwrap(res);
  },
};
