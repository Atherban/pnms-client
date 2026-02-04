import { api } from "./api";

export const SeedService = {
  async getAll() {
    const res = await api.get("/seeds");
    return res.data;
  },

  async getById(id: string) {
    const res = await api.get(`/seeds/${id}`);
    return res.data;
  },

  async create(payload: any) {
    const res = await api.post("/seeds", payload);
    return res.data;
  },

  async update(id: string, payload: any) {
    const res = await api.patch(`/seeds/${id}`, payload);
    return res.data;
  },

  async delete(id: string) {
    const res = await api.delete(`/seeds/${id}`);
    return res.data;
  },
};
