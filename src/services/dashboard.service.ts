// src/services/dashboard.service.ts
import { DashboardStats } from "../types/dashboard.types";
import { InventoryService } from "./inventory.service";
import { ProfitService } from "./profit.service";
import { SalesService } from "./sales.service";
import { SeedService } from "./seed.service";

/* ---------------- Utilities ---------------- */

const normalize = (res: any) => (Array.isArray(res) ? res : (res?.data ?? []));

const calcSaleAmount = (sale: any) => {
  if (Number(sale?.totalAmount)) return Number(sale.totalAmount);
  if (!Array.isArray(sale?.items)) return 0;

  return sale.items.reduce(
    (sum: number, i: any) =>
      sum +
      (Number(i.priceAtSale ?? i.unitPrice ?? i.price ?? 0) || 0) *
        (Number(i.quantity) || 0),
    0,
  );
};

const calcSaleProfit = (sale: any) => {
  const explicitProfit = Number(sale?.totalProfit ?? sale?.profit);
  if (Number.isFinite(explicitProfit)) return explicitProfit;

  const totalAmount = calcSaleAmount(sale);
  const totalCost = Number(sale?.totalCost ?? 0);
  return totalAmount - (Number.isFinite(totalCost) ? totalCost : 0);
};

const getSaleDate = (sale: any) => sale?.saleDate ?? sale?.createdAt ?? null;
const toLocalDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayDateOnly = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return toLocalDateKey(d);
};

/* ---------------- Service ---------------- */

export const DashboardService = {
  async getStats(): Promise<DashboardStats> {
    try {
      const [inventoryRes, seedsRes, salesRes, profitRes] = await Promise.all([
        InventoryService.getAll(),
        SeedService.getAll(),
        SalesService.getAll(),
        ProfitService.getProfit({
          startDate: todayDateOnly(),
          endDate: todayDateOnly(),
        }),
      ]);

      const inventory = normalize(inventoryRes);
      const seeds = normalize(seedsRes);
      const sales = normalize(salesRes);
      const start = new Date();
      const end = new Date();
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      const todayLocalKey = toLocalDateKey(new Date());
      const todayUtcKey = new Date().toISOString().slice(0, 10);

      const totalSalesAmount = sales.reduce(
        (sum: number, sale: any) => sum + calcSaleAmount(sale),
        0,
      );
      const todaySales = sales.filter((sale: any) => {
        const raw = getSaleDate(sale);
        if (!raw) return false;
        const date = new Date(raw);
        if (Number.isNaN(date.getTime())) return false;
        const saleUtcKey = date.toISOString().slice(0, 10);
        const saleLocalKey = toLocalDateKey(date);
        const matchesByKey =
          saleUtcKey === todayUtcKey || saleLocalKey === todayLocalKey;
        const matchesByRange = date >= start && date <= end;
        return matchesByRange || matchesByKey;
      });
      const derivedTodayProfit = todaySales.reduce(
        (sum: number, sale: any) => sum + calcSaleProfit(sale),
        0,
      );
      const apiTodayProfit = Number(
        profitRes?.profit ?? profitRes?.netProfit ?? Number.NaN,
      );
      const todayProfit =
        Number.isFinite(apiTodayProfit) &&
        (apiTodayProfit !== 0 || derivedTodayProfit === 0)
          ? apiTodayProfit
          : derivedTodayProfit;

      return {
        totalInventory: inventory.length,
        totalSeeds: seeds.length,
        totalSalesAmount,
        todayProfit,
      };
    } catch (e) {
      console.error("Dashboard stats failed", e);
      return {
        totalInventory: 0,
        totalSeeds: 0,
        totalSalesAmount: 0,
        todayProfit: 0,
      };
    }
  },
};
