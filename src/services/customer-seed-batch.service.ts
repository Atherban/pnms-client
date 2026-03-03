import { api, apiPath, unwrap } from "./api";
import { getApiList, getApiPayload } from "./api-contract.service";

export type CustomerSeedBatchStatus =
  | "RECEIVED"
  | "SOWN"
  | "GERMINATING"
  | "READY"
  | "COLLECTED"
  | "CLOSED"
  | "DISCARDED";

export interface CustomerSeedBatch {
  _id: string;
  customerId:
    | string
    | {
        _id: string;
        name?: string;
        mobileNumber?: string;
      };
  plantTypeId:
    | string
    | {
        _id: string;
        name?: string;
        category?: string;
        variety?: string;
      };
  seedQuantity: number;
  seedsSown?: number;
  seedsGerminated?: number;
  germinatedQuantity?: number;
  seedsDiscarded?: number;
  discardedQuantity?: number;
  status: CustomerSeedBatchStatus;
  expectedReadyDate?: string;
  estimatedPickupDate?: string;
  serviceChargeEstimate?: number;
  discountAmount?: number;
  finalAmount?: number;
  saleId?:
    | string
    | {
        _id?: string;
        saleNumber?: string;
        status?: string;
        paymentStatus?: string;
        totalAmount?: number;
        paidAmount?: number;
        dueAmount?: number;
      };
  sowingId?: string | { _id: string };
  germinationId?: string | { _id: string };
  createdAt?: string;
}

export const CustomerSeedBatchService = {
  async getAll() {
    const res = await api.get(apiPath("/customer-seed-batches"));
    return getApiList<CustomerSeedBatch>(unwrap(res));
  },

  async getById(id: string) {
    const res = await api.get(apiPath(`/customer-seed-batches/${id}`));
    return getApiPayload<CustomerSeedBatch>(unwrap(res));
  },

  async create(payload: {
    customerId: string;
    plantTypeId: string;
    seedQuantity: number;
    expectedReadyDate?: string;
    serviceChargeEstimate?: number;
    discountAmount?: number;
    finalAmount?: number;
    notes?: string;
  }) {
    const res = await api.post(apiPath("/customer-seed-batches"), payload);
    return getApiPayload<CustomerSeedBatch>(unwrap(res));
  },

  async update(
    id: string,
    payload: Partial<{
      seedQuantity: number;
      expectedReadyDate: string;
      serviceChargeEstimate: number;
      discountAmount: number;
      finalAmount: number;
      status: CustomerSeedBatchStatus;
      notes: string;
    }>,
  ) {
    const res = await api.patch(apiPath(`/customer-seed-batches/${id}`), payload);
    return getApiPayload<CustomerSeedBatch>(unwrap(res));
  },

  async markReady(id: string) {
    const res = await api.post(apiPath(`/customer-seed-batches/${id}/mark-ready`));
    return getApiPayload<CustomerSeedBatch>(unwrap(res));
  },

  async collect(id: string) {
    const res = await api.post(apiPath(`/customer-seed-batches/${id}/collect`));
    return getApiPayload<CustomerSeedBatch>(unwrap(res));
  }
};
