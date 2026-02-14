import { InventoryService } from "./inventory.service";
import { SalesService } from "./sales.service";

export const ReportService = {
  async getOverview() {
    const salesRes = await SalesService.getAll();
    const inventoryRes = await InventoryService.getAll();

    const sales = Array.isArray(salesRes) ? salesRes : [];

    const inventory = Array.isArray(inventoryRes) ? inventoryRes : [];

    /* ---------------- Sales aggregation ---------------- */

    const salesByDate: Record<string, number> = {};
    const salesByPlant: Record<string, number> = {};
    const paymentSplit: Record<string, number> = {
      CASH: 0,
      UPI: 0,
      ONLINE: 0,
    };

    for (const sale of sales) {
      const dateKey = new Date(sale.saleDate || sale.createdAt)
        .toISOString()
        .split("T")[0];

      let saleTotal = Number(sale.totalAmount) || 0;

      for (const item of sale.items || []) {
        const unitPrice =
          item.priceAtSale ??
          item.unitPrice ??
          item.price ??
          item.priceSnapshot ??
          0;
        const amount = (Number(unitPrice) || 0) * (item.quantity || 0);
        if (!Number(sale.totalAmount)) saleTotal += amount;

        const plantName =
          item.inventory?.plantType?.name ||
          item.plantType?.name ||
          item.inventoryId?.plantType?.name ||
          "Unknown";

        salesByPlant[plantName] = (salesByPlant[plantName] || 0) + amount;
      }

      salesByDate[dateKey] = (salesByDate[dateKey] || 0) + saleTotal;

      const mode = sale.paymentMode || "CASH";
      if (!paymentSplit[mode]) paymentSplit[mode] = 0;
      paymentSplit[mode] += saleTotal;
    }

    /* ---------------- Inventory stats ---------------- */

    const lowStock = inventory.filter((i: any) => i.quantity <= 10).length;

    return {
      salesByDate,
      salesByPlant,
      paymentSplit,
      inventoryCount: inventory.length,
      lowStock,
    };
  },
};
