// src/services/profit.service.ts
import { api, apiPath, unwrap } from "./api";

/* ---------------- Date Helpers ---------------- */

const parseDateInput = (date: string | Date) => {
  if (date instanceof Date) return new Date(date);

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(date);
};

const toDateOnly = (date: string | Date) => {
  const d = parseDateInput(date);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDaysDateOnly = (date: string | Date, days: number) => {
  const d = parseDateInput(date);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid endDate");
  d.setDate(d.getDate() + days);
  return toDateOnly(d);
};

export const ProfitService = {
  async getProfit(params: { startDate: string; endDate: string }) {
    if (!params.startDate || !params.endDate) {
      throw new Error("startDate and endDate are required");
    }

    const parseProfitResponse = (raw: any) => {
      const data = unwrap(raw);
      const payload =
        data &&
        typeof data === "object" &&
        data.data &&
        typeof data.data === "object"
          ? data.data
          : data;

      if (!payload || typeof payload !== "object") {
        throw new Error("Invalid profit API response");
      }

      return {
        totalSales: Number(
          payload.totalSales ?? payload.salesAmount ?? payload.grossSales ?? 0,
        ),
        totalExpenses: Number(
          payload.totalExpenses ?? payload.totalCost ?? payload.expenses ?? 0,
        ),
        profit: Number(
          payload.netProfit ?? payload.totalProfit ?? payload.profit ?? 0,
        ),
      };
    };

    const startDateOnly = toDateOnly(params.startDate);
    const endDateOnly = toDateOnly(params.endDate);
    const endDatePlusOne = addDaysDateOnly(params.endDate, 1);

    const requestVariants = [
      { startDate: startDateOnly, endDate: endDatePlusOne },
      { startDate: startDateOnly, endDate: endDateOnly },
    ];

    let bestResult: { totalSales: number; totalExpenses: number; profit: number } | null =
      null;

    for (const variant of requestVariants) {
      const res = await api.get(apiPath("/profit"), { params: variant });
      const parsed = parseProfitResponse(res);

      if (!bestResult) {
        bestResult = parsed;
      }

      // Prefer first non-zero response to avoid false zero caused by date boundaries.
      if (parsed.totalSales !== 0 || parsed.profit !== 0 || parsed.totalExpenses !== 0) {
        return parsed;
      }
    }

    return bestResult ?? { totalSales: 0, totalExpenses: 0, profit: 0 };
  },
};
