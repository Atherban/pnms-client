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

const toFiniteNumber = (value: unknown): number | undefined => {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const pickFirstNumber = (payload: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    if (!(key in payload)) continue;
    const n = toFiniteNumber(payload[key]);
    if (n !== undefined) return n;
  }
  return undefined;
};

const daysBetweenInclusive = (startDateOnly: string, endDateOnly: string) => {
  const start = parseDateInput(startDateOnly);
  const end = parseDateInput(endDateOnly);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
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

      const sales = pickFirstNumber(payload, [
        "totalSales",
        "salesAmount",
        "grossSales",
        "totalRevenue",
      ]);
      const expenses = pickFirstNumber(payload, [
        "totalExpenses",
        "totalCost",
        "expenses",
        "expenseAmount",
      ]);
      const profitValue = pickFirstNumber(payload, [
        "netProfit",
        "totalProfit",
        "profit",
      ]);

      const totalSales = sales ?? 0;
      const totalExpenses = expenses ?? 0;
      const profit = profitValue ?? totalSales - totalExpenses;

      if (totalSales < 0 || totalExpenses < 0) {
        throw new Error("Invalid profit values received from server");
      }

      return {
        totalSales,
        totalExpenses,
        profit,
      };
    };

    const startDateOnly = toDateOnly(params.startDate);
    const endDateOnly = toDateOnly(params.endDate);
    const inclusiveDays = daysBetweenInclusive(startDateOnly, endDateOnly);

    if (inclusiveDays <= 0) {
      throw new Error("startDate must be on or before endDate");
    }

    if (inclusiveDays > 366) {
      throw new Error("Date range cannot exceed 366 days");
    }

    const res = await api.get(apiPath("/profit"), {
      params: { startDate: startDateOnly, endDate: endDateOnly },
    });
    return parseProfitResponse(res);
  },
};
