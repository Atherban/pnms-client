import { api, apiPath, unwrap } from "./api";
import { extractServiceParams, withScopedParams } from "./access-scope.service";
import { getApiList } from "./api-contract.service";

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

export interface StaffPerformanceFilters {
  dateFrom?: string;
  dateTo?: string;
  staffId?: string;
}

export const StaffPerformanceService = {
  async getRows(filters?: StaffPerformanceFilters): Promise<StaffPerformanceRow[]> {
    const parsed = extractServiceParams(filters);
    const res = await api.get(apiPath("/staff-accounts/performance"), {
      params: withScopedParams({
        startDate: parsed?.dateFrom,
        endDate: parsed?.dateTo,
        staffUserId: parsed?.staffId,
      }),
    });
    return getApiList<StaffPerformanceRow>(unwrap(res)).map((row: any) => ({
      staffId: String(row?.staffId || row?.staffUserId || ""),
      staffName: row?.staffName || "Unknown Staff",
      staffRole: row?.staffRole || "STAFF",
      staffEmail: row?.staffEmail || null,
      salesCount: Number(row?.salesCount || 0),
      revenue: Number(row?.revenue || 0),
      collectedAmount: Number(row?.collectedAmount || 0),
      dueAmount: Number(row?.dueAmount || 0),
    }));
  },
};
