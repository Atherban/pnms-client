// services/seed.service.ts
import type { CreateSeedPayload, Seed } from "../types/seed.types";
import { api, apiPath, unwrap } from "./api";

export type { CreateSeedPayload, Seed };

export const SeedService = {
  async getAll() {
    const res = await api.get(apiPath("/seeds"));
    return unwrap(res) ?? [];
  },

  async getById(id: string) {
    const res = await api.get(apiPath(`/seeds/${id}`));
    return unwrap(res);
  },

  async create(payload: CreateSeedPayload) {
    const res = await api.post(apiPath("/seeds"), payload);
    return unwrap(res);
  },

  async update(id: string, payload: any) {
    const res = await api.patch(apiPath(`/seeds/${id}`), payload);
    return unwrap(res);
  },

  async delete(id: string) {
    const res = await api.delete(apiPath(`/seeds/${id}`));
    return unwrap(res);
  },
};
