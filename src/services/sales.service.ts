import { api, apiPath, unwrap } from "./api";
import type { Sale } from "../types/sales.type";

const normalizeList = (data: any) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

export const SalesService = {
  async getAll(): Promise<Sale[]> {
    const res = await api.get(apiPath("/sales"));
    return normalizeList(unwrap(res));
  },

  async getById(id: string): Promise<Sale> {
    const res = await api.get(apiPath(`/sales/${id}`));
    const data = unwrap(res);
    return data?.data ?? data;
  },

  async create(payload: {
    customer?: string;
    items: {
      inventoryId: string;
      quantity: number;
    }[];
    paymentMode: "CASH" | "UPI" | "ONLINE";
  }) {
    const res = await api.post(apiPath("/sales"), payload);
    return unwrap(res);
  },
};
