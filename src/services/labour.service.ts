import type { Labour, LabourPayload } from "../types/labour.types";
import { api, apiPath, unwrap } from "./api";
import { extractServiceParams, withScopedParams } from "./access-scope.service";
import { getApiList, getApiPayload } from "./api-contract.service";

export const LabourService = {
  async getAll(params?: any): Promise<Labour[]> {
    const parsed = extractServiceParams<{ nurseryId?: string }>(params);
    const res = await api.get(apiPath("/labours"), {
      params: withScopedParams(parsed),
    });
    return getApiList<Labour>(unwrap(res));
  },

  async getById(id: string): Promise<Labour> {
    const res = await api.get(apiPath(`/labours/${id}`));
    return getApiPayload<Labour>(unwrap(res));
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
