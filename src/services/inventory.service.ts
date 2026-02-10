import { api, apiPath, unwrap } from "./api";

export const InventoryService = {
  async getAll() {
    const res = await api.get(apiPath("/inventory"));
    return unwrap(res);
  },

  async getById(id: string) {
    const res = await api.get(apiPath(`/inventory/${id}`));
    return unwrap(res);
  },

  async create(payload: { plantType: string; quantity?: number }) {
    const res = await api.post(apiPath("/inventory"), payload);
    return unwrap(res);
  },
};
