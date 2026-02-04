import { DashboardStats } from "../types/dashboard.types";
import { PlantService } from "./plant.service";
import { ProfitService } from "./profit.service";
import { SalesService } from "./sales.service";
import { SeedService } from "./seed.service";

export const DashboardService = {
  async getStats(): Promise<DashboardStats> {
    const today = new Date().toISOString().split("T")[0];

    try {
      const [plants, seeds, sales, profit] = await Promise.all([
        PlantService.getAll().catch(() => []),
        SeedService.getAll().catch(() => []),
        SalesService.getAll().catch(() => []),
        ProfitService.getProfit({
          startDate: today,
          endDate: today,
        }).catch(() => ({ profit: 0 })),
      ]);

      const plantList = Array.isArray(plants) ? plants : (plants?.data ?? []);
      const seedList = Array.isArray(seeds) ? seeds : (seeds?.data ?? []);
      const salesList = Array.isArray(sales) ? sales : (sales?.data ?? []);

      return {
        totalPlants: plantList.length,
        totalSeeds: seedList.length,
        totalSalesAmount: salesList.reduce(
          (sum, s) => sum + (s.totalAmount ?? 0),
          0,
        ),
        todayProfit: profit?.profit ?? 0,
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
