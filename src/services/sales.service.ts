import { api, apiPath, unwrap } from "./api";
import { extractServiceParams, withScopedParams } from "./access-scope.service";
import { getApiList, getApiPayload } from "./api-contract.service";
import type { Sale } from "../types/sales.type";
import { withResolvedImagesDeep } from "../utils/image";

export const SalesService = {
  async getAll(params?: any): Promise<Sale[]> {
    const parsed = extractServiceParams<{
      nurseryId?: string;
      customerId?: string;
      customerPhone?: string;
    }>(params);
    const res = await api.get(apiPath("/sales"), {
      params: withScopedParams(parsed, { includeCustomerIdentity: true }),
    });
    return withResolvedImagesDeep(getApiList<Sale>(unwrap(res)));
  },

  async getById(id: string): Promise<Sale> {
    const res = await api.get(apiPath(`/sales/${id}`));
    const data = getApiPayload<Sale>(unwrap(res));
    return withResolvedImagesDeep(data);
  },

  async create(payload: {
    saleKind?: "PRODUCT" | "SERVICE" | "SERVICE_SALE";
    customer?: string;
    customerSeedBatchId?: string;
    items: {
      inventoryId: string;
      quantity: number;
      priceAtSale?: number;
    }[];
    serviceInvoice?: {
      sowingCharge?: number;
      germinationCharge?: number;
      labourCharge?: number;
      soilCharge?: number;
      trayCharge?: number;
      maintenanceCharge?: number;
      otherCharge?: number;
      notes?: string;
    };
    paymentMode: "CASH" | "UPI" | "ONLINE" | "BANK_TRANSFER" | "BANK";
    amountPaid?: number;
    discountAmount?: number;
    utrNumber?: string;
    transactionRef?: string;
  }) {
    const res = await api.post(apiPath("/sales"), payload);
    return unwrap(res);
  },

  async createReturn(
    id: string,
    payload:
      | {
          items: {
            saleItemId: string;
            quantityReturned: number;
            inventoryAction?: "RESTOCK" | "SCRAP";
          }[];
          reason?: string;
        }
      | { quantity: number; reason?: string; refundAmount?: number; saleItemId?: string },
  ) {
    const requestPayload =
      "items" in payload
        ? payload
        : payload.saleItemId
          ? {
              items: [
                {
                  saleItemId: payload.saleItemId,
                  quantityReturned: payload.quantity,
                  inventoryAction: "RESTOCK",
                },
              ],
              reason: payload.reason,
            }
          : payload;
    const res = await api.post(apiPath(`/sales/${id}/returns`), requestPayload);
    return unwrap(res);
  },

  async getReturns(params?: { saleId?: string; status?: "REQUESTED" | "APPROVED" | "REJECTED" | "COMPLETED" }) {
    const res = await api.get(apiPath("/sales/returns"), {
      params: withScopedParams(extractServiceParams(params)),
    });
    return getApiList<any>(unwrap(res));
  },

  async getReturnById(returnId: string) {
    const res = await api.get(apiPath(`/sales/returns/${returnId}`));
    return getApiPayload<any>(unwrap(res));
  },

  async approveReturn(returnId: string) {
    const res = await api.post(apiPath(`/sales/returns/${returnId}/approve`), {});
    return getApiPayload<any>(unwrap(res));
  },

  async rejectReturn(returnId: string, reason: string) {
    const res = await api.post(apiPath(`/sales/returns/${returnId}/reject`), { reason });
    return getApiPayload<any>(unwrap(res));
  },

  async completeReturn(returnId: string) {
    const res = await api.post(apiPath(`/sales/returns/${returnId}/complete`), {});
    return getApiPayload<any>(unwrap(res));
  },
};
