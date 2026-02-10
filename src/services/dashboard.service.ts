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

const startOfTodayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const endOfTodayISO = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
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
          startDate: startOfTodayISO(),
          endDate: endOfTodayISO(),
        }),
      ]);

      const inventory = normalize(inventoryRes);
      const seeds = normalize(seedsRes);
      const sales = normalize(salesRes);

      const totalSalesAmount = sales.reduce(
        (sum: number, sale: any) => sum + calcSaleAmount(sale),
        0,
      );

      return {
        totalInventory: inventory.length,
        totalSeeds: seeds.length,
        totalSalesAmount,
        todayProfit: profitRes?.profit ?? profitRes?.netProfit ?? 0,
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
