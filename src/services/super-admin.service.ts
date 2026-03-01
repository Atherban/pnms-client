import { SalesService } from "./sales.service";

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getAmount = (sale: any) => {
  const direct = toNumber(sale?.totalAmount);
  if (direct > 0) return direct;
  return (Array.isArray(sale?.items) ? sale.items : []).reduce(
    (sum: number, item: any) =>
      sum + toNumber(item?.quantity) * toNumber(item?.priceAtSale ?? item?.unitPrice ?? item?.price),
    0,
  );
};

export interface NurserySummary {
  nurseryId: string;
  nurseryName: string;
  salesCount: number;
  revenue: number;
}

export const SuperAdminService = {
  async getNurserySummary(): Promise<NurserySummary[]> {
    const sales = await SalesService.getAll();
    const rows = new Map<string, NurserySummary>();

    for (const sale of Array.isArray(sales) ? sales : []) {
      const nurseryId = String((sale as any)?.nurseryId || "default");
      const nurseryName = String((sale as any)?.nurseryName || "Default Nursery");
      if (!rows.has(nurseryId)) {
        rows.set(nurseryId, {
          nurseryId,
          nurseryName,
          salesCount: 0,
          revenue: 0,
        });
      }
      const row = rows.get(nurseryId)!;
      row.salesCount += 1;
      row.revenue += getAmount(sale);
    }

    return Array.from(rows.values()).sort((a, b) => b.revenue - a.revenue);
  },
};
