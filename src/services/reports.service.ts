import { api, apiPath, unwrap } from "./api";
import { extractServiceParams, withScopedParams } from "./access-scope.service";
import { getApiPayload } from "./api-contract.service";

export interface StaffAnalyticsRow {
  staffUserId: string;
  staffName?: string;
  salesMade?: number;
  collections?: number;
  expensesRecorded?: number;
}

export interface AnalyticsOverview {
  sales: {
    totalSales: number;
    totalPaid: number;
    totalDue: number;
    refundedAmount: number;
    profit: number;
  };
  inventory: {
    totalPlantsAvailable: number;
    plantsSold: number;
    plantsReturned: number;
    plantsDiscarded: number;
  };
  seedLifecycle: {
    seedsPurchased: number;
    seedsSown: number;
    germinatedPlants: number;
    discardedSeeds: number;
  };
  customers: {
    totalCustomers: number;
    customersWithDues: number;
    customersWithCompletedPayments: number;
  };
  staff: {
    analytics: StaffAnalyticsRow[];
  };
}

export const ReportService = {
  async getOverview(params?: {
    nurseryId?: string;
    startDate?: string;
    endDate?: string;
    staffId?: string;
    plantTypeId?: string;
    customerId?: string;
  }): Promise<AnalyticsOverview> {
    const parsed = extractServiceParams(params);
    const res = await api.get(apiPath("/reports/analytics"), {
      params: withScopedParams(parsed),
    });
    const root = unwrap<any>(res);
    const analytics = getApiPayload<AnalyticsOverview>(root);

    return {
      sales: {
        totalSales: Number(analytics?.sales?.totalSales || 0),
        totalPaid: Number(analytics?.sales?.totalPaid || 0),
        totalDue: Number(analytics?.sales?.totalDue || 0),
        refundedAmount: Number(analytics?.sales?.refundedAmount || 0),
        profit: Number(analytics?.sales?.profit || 0),
      },
      inventory: {
        totalPlantsAvailable: Number(analytics?.inventory?.totalPlantsAvailable || 0),
        plantsSold: Number(analytics?.inventory?.plantsSold || 0),
        plantsReturned: Number(analytics?.inventory?.plantsReturned || 0),
        plantsDiscarded: Number(analytics?.inventory?.plantsDiscarded || 0),
      },
      seedLifecycle: {
        seedsPurchased: Number(analytics?.seedLifecycle?.seedsPurchased || 0),
        seedsSown: Number(analytics?.seedLifecycle?.seedsSown || 0),
        germinatedPlants: Number(analytics?.seedLifecycle?.germinatedPlants || 0),
        discardedSeeds: Number(analytics?.seedLifecycle?.discardedSeeds || 0),
      },
      customers: {
        totalCustomers: Number(analytics?.customers?.totalCustomers || 0),
        customersWithDues: Number(analytics?.customers?.customersWithDues || 0),
        customersWithCompletedPayments: Number(analytics?.customers?.customersWithCompletedPayments || 0),
      },
      staff: {
        analytics: Array.isArray(analytics?.staff?.analytics)
          ? analytics.staff.analytics.map((row) => ({
              staffUserId: String(row?.staffUserId || ""),
              staffName: row?.staffName || undefined,
              salesMade: Number(row?.salesMade || 0),
              collections: Number(row?.collections || 0),
              expensesRecorded: Number(row?.expensesRecorded || 0),
            }))
          : [],
      },
    };
  },
};
