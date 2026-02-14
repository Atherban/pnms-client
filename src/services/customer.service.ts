import type { Customer, CustomerPayload } from "../types/customer.types";
import { api, apiPath, unwrap } from "./api";

const listFrom = (res: any): Customer[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  return [];
};

export const CustomerService = {
  async getAll(): Promise<Customer[]> {
    const res = await api.get(apiPath("/customers"));
    return listFrom(unwrap(res));
  },

  async getById(id: string): Promise<Customer> {
    const res = await api.get(apiPath(`/customers/${id}`));
    const data = unwrap(res);
    return data?.data ?? data;
  },

  async create(payload: CustomerPayload) {
    const res = await api.post(apiPath("/customers"), payload);
    return unwrap(res);
  },

  async update(id: string, payload: Partial<CustomerPayload>) {
    const res = await api.patch(apiPath(`/customers/${id}`), payload);
    return unwrap(res);
  },

  async delete(id: string) {
    const res = await api.delete(apiPath(`/customers/${id}`));
    return unwrap(res);
  },
};
