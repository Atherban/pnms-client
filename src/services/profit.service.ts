import { ProfitRequest, ProfitResponse } from "../types/profit.types";
import { api } from "./api";

export const ProfitService = {
  async getProfit(payload: ProfitRequest): Promise<ProfitResponse> {
    const result = await api.post<ProfitResponse>(`/profit`, payload);

    // NORMALIZE SHAPE
    if (typeof result.data === "number") {
      return {
        totalSales: 0,
        totalExpenses: 0,
        profit: result.data,
      };
    }

    return result.data;
  },
};
