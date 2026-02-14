import type { Labour, LabourPayload } from "../types/labour.types";
import { api, apiPath, unwrap } from "./api";

const listFrom = (res: any): Labour[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  return [];
};

export const LabourService = {
  async getAll(): Promise<Labour[]> {
    const res = await api.get(apiPath("/labours"));
    return listFrom(unwrap(res));
  },

  async getById(id: string): Promise<Labour> {
    const res = await api.get(apiPath(`/labours/${id}`));
    const data = unwrap(res);
    return data?.data ?? data;
  },

  async create(payload: LabourPayload) {
    const res = await api.post(apiPath("/labours"), payload);
    return unwrap(res);
  },

  async update(id: string, payload: Partial<LabourPayload>) {
    const res = await api.patch(apiPath(`/labours/${id}`), payload);
    return unwrap(res);
  },

  async delete(id: string) {
    const res = await api.delete(apiPath(`/labours/${id}`));
    return unwrap(res);
  },
};
