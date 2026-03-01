import type { Expense, ExpensePayload } from "../types/expense.types";
import { api, apiPath, unwrap } from "./api";
import { extractServiceParams, withScopedParams } from "./access-scope.service";
import { getApiList, getApiPayload } from "./api-contract.service";

export const ExpenseService = {
  async getAll(params?: any): Promise<Expense[]> {
    const parsed = extractServiceParams<{ nurseryId?: string }>(params);
    const res = await api.get(apiPath("/expenses"), {
      params: withScopedParams(parsed),
    });
    return getApiList<Expense>(unwrap(res));
  },

  async getById(id: string): Promise<Expense> {
    const res = await api.get(apiPath(`/expenses/${id}`));
    return getApiPayload<Expense>(unwrap(res));
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
