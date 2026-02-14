import { CustomerService } from "./customer.service";
import { ExpenseService } from "./expense.service";
import { InventoryService } from "./inventory.service";
import { LabourService } from "./labour.service";
import { SalesService } from "./sales.service";
import { SeedService } from "./seed.service";

export interface ViewerDashboardStats {
  totalInventory: number;
  totalSeeds: number;
  totalSales: number;
  totalCustomers: number;
  totalExpenses: number;
  totalLabours: number;
  lowStockItems: number;
}

export const ViewerDashboardService = {
  async getStats(): Promise<ViewerDashboardStats> {
    const results = await Promise.allSettled([
      InventoryService.getAll(),
      SeedService.getAll(),
      SalesService.getAll(),
      CustomerService.getAll(),
      ExpenseService.getAll(),
      LabourService.getAll(),
    ]);

    const inventory = results[0].status === "fulfilled" ? results[0].value : [];
    const seeds = results[1].status === "fulfilled" ? results[1].value : [];
    const sales = results[2].status === "fulfilled" ? results[2].value : [];
    const customers = results[3].status === "fulfilled" ? results[3].value : [];
    const expenses = results[4].status === "fulfilled" ? results[4].value : [];
    const labours = results[5].status === "fulfilled" ? results[5].value : [];

    return {
      totalInventory: inventory.length,
      totalSeeds: seeds.length,
      totalSales: sales.length,
      totalCustomers: customers.length,
      totalExpenses: expenses.length,
      totalLabours: labours.length,
      lowStockItems: inventory.filter((item: any) => Number(item.quantity ?? 0) <= 10)
        .length,
    };
  },
};
