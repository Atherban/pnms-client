import { api, apiPath, unwrap } from "./api";

export interface StaffAccountRow {
  staffId: string;
  staffName: string;
  staffPhoneNumber?: string | null;
  staffEmail?: string | null;
  staffRole?: string | null;
  periodStart?: string;
  periodEnd?: string;
  salesCount: number;
  salesAmount: number;
  collectionsAmount: number;
  expensesAmount: number;
  netBalance: number;
  pendingDueAmount: number;
  pendingDueSalesCount: number;
}

const toNumber = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export const StaffAccountingService = {
  async getRows(): Promise<StaffAccountRow[]> {
    const res = await api.get(apiPath("/staff-accounts"));
    const data = unwrap<any>(res);
    const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

    return list.map((row: any) => ({
      staffId: String(row?.staffUserId || row?.staffId || row?.staff?._id || row?._id || ""),
      staffName: row?.staffName || row?.staff?.name || "Unknown",
      staffPhoneNumber: row?.staffPhoneNumber || row?.staff?.phoneNumber || null,
      staffEmail: row?.staffEmail || row?.staff?.email || null,
      staffRole: row?.staffRole || row?.staff?.role || null,
      periodStart: row?.periodStart,
      periodEnd: row?.periodEnd,
      salesCount: toNumber(row?.salesCount),
      salesAmount: toNumber(row?.salesAmount),
      collectionsAmount: toNumber(row?.collectionsAmount),
      expensesAmount: toNumber(row?.expensesAmount),
      netBalance: toNumber(row?.netBalance),
      pendingDueAmount: toNumber(row?.pendingDueAmount),
      pendingDueSalesCount: toNumber(row?.pendingDueSalesCount),
    }));
  },
};
