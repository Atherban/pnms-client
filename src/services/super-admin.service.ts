import { SalesService } from "./sales.service";

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getAmount = (sale: any) => {
  const direct = toNumber(sale?.netAmount ?? sale?.totalAmount);
  if (direct > 0) return direct;
  return (Array.isArray(sale?.items) ? sale.items : []).reduce(
    (sum: number, item: any) =>
      sum + toNumber(item?.quantity) * toNumber(item?.priceAtSale ?? item?.unitPrice ?? item?.price),
    0,
  );
};

const resolveNurseryRef = (sale: any) => {
  const raw = sale?.nurseryId;
  if (!raw) return { nurseryId: "default", nurseryName: "Default Nursery" };
  if (typeof raw === "string") return { nurseryId: raw, nurseryName: sale?.nurseryName || "Nursery" };
  const nurseryId = String(raw?._id || raw?.id || raw);
  const nurseryName = String(raw?.name || sale?.nurseryName || "Nursery");
  return {
    nurseryId: nurseryId && nurseryId !== "[object Object]" ? nurseryId : "default",
    nurseryName,
  };
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
      const { nurseryId, nurseryName } = resolveNurseryRef(sale);
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
