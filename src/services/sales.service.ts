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
    customer?: string;
    items: {
      inventoryId: string;
      quantity: number;
      priceAtSale?: number;
    }[];
    paymentMode: "CASH" | "UPI" | "ONLINE";
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
            inventoryAction?: "RESTOCK" | "DISCARD";
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
};
