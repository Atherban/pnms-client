import { PlantService } from "./plant.service";
import { SalesService } from "./sales.service";
import { SeedService } from "./seed.service";
import { SowingService } from "./sowing.service";

export interface StaffDashboardStats {
  totalPlants: number;
  totalSeeds: number;
  todaySalesCount: number;
  todaySowingCount: number;
}

export const StaffDashboardService = {
  async getStats(): Promise<StaffDashboardStats> {
    const today = new Date().toISOString().split("T")[0];

    const results = await Promise.allSettled([
      PlantService.getAll(),
      SeedService.getAll(),
      SalesService.getAll(),
      SowingService.getAll(),
    ]);

    const plants = results[0].status === "fulfilled" ? results[0].value : [];

    const seeds = results[1].status === "fulfilled" ? results[1].value : [];

    const sales = results[2].status === "fulfilled" ? results[2].value : [];

    const sowings = results[3].status === "fulfilled" ? results[3].value : [];

    const isToday = (date: string) => date.startsWith(today);

    return {
      totalPlants: plants.length,
      totalSeeds: seeds.length,
      todaySalesCount: sales.filter((s) => isToday(s.createdAt)).length,
      todaySowingCount: sowings.filter((s) => isToday(s.createdAt)).length,
    };
  },
};
