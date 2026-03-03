import { SalesService } from "./sales.service";

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clamp = (
  value: number,
  min = 0,
  max = Number.POSITIVE_INFINITY,
) => Math.min(Math.max(value, min), max);

const resolveSaleFinancials = (sale: any) => {
  const lineTotal = (Array.isArray(sale?.items) ? sale.items : []).reduce(
    (sum: number, item: any) =>
      sum +
      toNumber(item?.quantity) *
        toNumber(item?.priceAtSale ?? item?.unitPrice ?? item?.price),
    0,
  );

  const gross = Math.max(
    0,
    toNumber(sale?.grossAmount ?? sale?.totalAmount) || lineTotal,
  );
  const discount = clamp(toNumber(sale?.discountAmount), 0, gross);
  const revenue = Math.max(0, toNumber(sale?.netAmount) || gross - discount);
  const paidRaw = Math.max(
    0,
    toNumber(sale?.paidAmount ?? sale?.amountPaid ?? sale?.paymentSummary?.paidAmount),
  );
  const dueRaw = Math.max(0, toNumber(sale?.dueAmount));
  const collected = clamp(paidRaw || Math.max(0, revenue - dueRaw), 0, revenue);
  let dueAmount = clamp(dueRaw || Math.max(0, revenue - collected), 0, revenue);

  if (Math.abs(revenue - (collected + dueAmount)) > 0.01) {
    dueAmount = clamp(revenue - collected, 0, revenue);
  }

  return { revenue, collected, dueAmount };
};

export interface StaffPerformanceRow {
  staffId: string;
  staffName: string;
  staffRole?: string;
  staffEmail?: string | null;
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
      const performerRole = String(
        performerObj?.role || sale?.roleAtTime || "",
      ).toUpperCase();
      const isStaff = performerRole === "STAFF";
      if (!isStaff) continue;

      const staffId = String(performerObj?._id || sale?.performedBy || "unknown");
      const staffName = performerObj?.name || performerObj?.email || "Unknown Staff";
      const staffEmail = performerObj?.email || null;
      const finance = resolveSaleFinancials(sale);
      const revenue = finance.revenue;
      const collected = finance.collected;

      if (!map.has(staffId)) {
        map.set(staffId, {
          staffId,
          staffName,
          staffRole: performerRole,
          staffEmail,
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
      row.dueAmount += finance.dueAmount;
    }

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  },
};
