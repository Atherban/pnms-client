import { DashboardStats } from "../types/dashboard.types";
import { PlantService } from "./plant.service";
import { ProfitService } from "./profit.service";
import { SalesService } from "./sales.service";
import { SeedService } from "./seed.service";

export const DashboardService = {
  async getStats(): Promise<DashboardStats> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    try {
      const [plantsRes, seedsRes, salesRes, profitRes] = await Promise.all([
        PlantService.getAll().catch(() => []),
        SeedService.getAll().catch(() => []),
        SalesService.getAll().catch(() => []),
        ProfitService.getProfit({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        }).catch(() => null),
      ]);

      /* ---------------- Normalize API responses ---------------- */

      const plants = Array.isArray(plantsRes)
        ? plantsRes
        : (plantsRes?.data ?? []);

      const seeds = Array.isArray(seedsRes) ? seedsRes : (seedsRes?.data ?? []);

      const sales = Array.isArray(salesRes) ? salesRes : (salesRes?.data ?? []);

      /* ---------------- Calculate total sales amount ---------------- */

      const totalSalesAmount = sales.reduce((sum: number, sale: any) => {
        if (!Array.isArray(sale.items)) return sum;

        return (
          sum +
          sale.items.reduce(
            (itemSum: number, item: any) =>
              itemSum +
              (Number(item.priceAtSale) || 0) * (Number(item.quantity) || 0),
            0,
          )
        );
      }, 0);

      /* ---------------- Normalize profit response ---------------- */

      const profitData = profitRes?.data ?? profitRes ?? {};

      return {
        totalPlants: plants.length,
        totalSeeds: seeds.length,
        totalSalesAmount,
        todayProfit: Number(profitData.netProfit) || 0,
      };
    } catch {
      return {
        totalPlants: 0,
        totalSeeds: 0,
        totalSalesAmount: 0,
        todayProfit: 0,
      };
    }
  },
};
