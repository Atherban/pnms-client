// src/services/profit.service.ts
import { api, apiPath, unwrap } from "./api";

/* ---------------- Helpers ---------------- */

const toDateOnly = (d: string) => {
  // Ensures YYYY-MM-DD
  if (d.includes("T")) return d.split("T")[0];
  return d;
};

export const ProfitService = {
  async getProfit(params: { startDate: string; endDate: string }) {
    const normalizedParams = {
      startDate: toDateOnly(params.startDate),
      endDate: toDateOnly(params.endDate),
    };

    const res = await api.get(apiPath("/profit"), {
      params: normalizedParams,
    });

    const data = unwrap(res) ?? {};

    return {
      totalSales: Number(data.totalSales ?? 0),
      totalExpenses: Number(data.totalExpenses ?? 0),
      profit: Number(data.netProfit ?? data.profit ?? 0),
    };
  },
};
