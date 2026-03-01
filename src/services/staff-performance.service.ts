import { SalesService } from "./sales.service";

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const resolveAmount = (sale: any) => {
  const direct = toNumber(sale?.totalAmount);
  if (direct > 0) return direct;
  return (Array.isArray(sale?.items) ? sale.items : []).reduce(
    (sum: number, item: any) =>
      sum + toNumber(item?.quantity) * toNumber(item?.priceAtSale ?? item?.unitPrice ?? item?.price),
    0,
  );
};

const resolvePaid = (sale: any) => {
  const paid = toNumber(sale?.paidAmount ?? sale?.amountPaid ?? sale?.paymentSummary?.paidAmount);
  if (paid > 0) return paid;
  return String(sale?.status || "").toUpperCase() === "COMPLETED" ? resolveAmount(sale) : 0;
};

export interface StaffPerformanceRow {
  staffId: string;
  staffName: string;
  salesCount: number;
  revenue: number;
  collectedAmount: number;
  dueAmount: number;
}

export const StaffPerformanceService = {
  async getRows(): Promise<StaffPerformanceRow[]> {
    const sales = await SalesService.getAll();
    const map = new Map<string, StaffPerformanceRow>();

    for (const sale of Array.isArray(sales) ? sales : []) {
      const performerObj =
        typeof sale?.performedBy === "object"
          ? sale?.performedBy
          : undefined;
      const staffId = String(performerObj?._id || sale?.performedBy || "unknown");
      const staffName = performerObj?.name || performerObj?.email || "Unknown Staff";
      const revenue = resolveAmount(sale);
      const collected = resolvePaid(sale);

      if (!map.has(staffId)) {
        map.set(staffId, {
          staffId,
          staffName,
          salesCount: 0,
          revenue: 0,
          collectedAmount: 0,
          dueAmount: 0,
        });
      }

      const row = map.get(staffId)!;
      row.salesCount += 1;
      row.revenue += revenue;
      row.collectedAmount += collected;
      row.dueAmount += Math.max(0, revenue - collected);
    }

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  },
};
