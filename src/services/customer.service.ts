import type { Customer, CustomerPayload } from "../types/customer.types";
import { api, apiPath, unwrap } from "./api";
import { extractServiceParams, withScopedParams } from "./access-scope.service";
import { getApiList, getApiPayload } from "./api-contract.service";

export const CustomerService = {
  async getAll(params?: any): Promise<Customer[]> {
    const parsed = extractServiceParams<{ nurseryId?: string }>(params);
    const res = await api.get(apiPath("/customers"), {
      params: withScopedParams(parsed),
    });
    return getApiList<Customer>(unwrap(res));
  },

  async getById(id: string): Promise<Customer> {
    const res = await api.get(apiPath(`/customers/${id}`));
    return getApiPayload<Customer>(unwrap(res));
  },

  async getMyProfile(): Promise<Customer> {
    const res = await api.get(apiPath("/customers/me/profile"));
    return getApiPayload<Customer>(unwrap(res));
  },

  async create(payload: CustomerPayload) {
    const res = await api.post(apiPath("/customers"), payload);
    return unwrap(res);
  },

  async update(id: string, payload: Partial<CustomerPayload>) {
    const res = await api.patch(apiPath(`/customers/${id}`), payload);
    return unwrap(res);
  },

  async updateMyProfile(payload: Partial<CustomerPayload>) {
    const res = await api.patch(apiPath("/customers/me/profile"), payload);
    return unwrap(res);
  },

  async delete(id: string) {
    const res = await api.delete(apiPath(`/customers/${id}`));
    return unwrap(res);
  },
};
