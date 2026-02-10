import { api, apiPath, unwrap } from "./api";

export const SalesService = {
  async getAll() {
    const res = await api.get(apiPath("/sales"));
    return unwrap(res);
  },

  async getById(id: string) {
    const res = await api.get(apiPath(`/sales/${id}`));
    return unwrap(res);
  },

  async create(payload: {
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
