import type { Expense, ExpensePayload } from "../types/expense.types";
import { api, apiPath, unwrap } from "./api";

const listFrom = (res: any): Expense[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  return [];
};

export const ExpenseService = {
  async getAll(): Promise<Expense[]> {
    const res = await api.get(apiPath("/expenses"));
    return listFrom(unwrap(res));
  },

  async getById(id: string): Promise<Expense> {
    const res = await api.get(apiPath(`/expenses/${id}`));
    const data = unwrap(res);
    return data?.data ?? data;
  },

  async create(payload: ExpensePayload) {
    const res = await api.post(apiPath("/expenses"), payload);
    return unwrap(res);
  },

  async update(id: string, payload: Partial<ExpensePayload>) {
    const res = await api.patch(apiPath(`/expenses/${id}`), payload);
    return unwrap(res);
  },

  async delete(id: string) {
    const res = await api.delete(apiPath(`/expenses/${id}`));
    return unwrap(res);
  },
};
