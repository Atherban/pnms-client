import { api, apiPath, unwrap } from "./api";
import { extractServiceParams, withScopedParams } from "./access-scope.service";
import type { Inventory } from "../types/inventory.types";
import { withResolvedImagesDeep } from "../utils/image";

export interface Germination {
  _id: string;
  sowingId: {
    _id: string;
    seedId:
      | { _id: string; name: string; plantType?: { _id: string; name: string } }
      | string;
    plantId?: { _id: string; name: string };
    quantity: number;
  };
  germinatedSeeds: number;
  performedBy: {
    _id: string;
    name: string;
    role: "ADMIN" | "STAFF";
  };
  roleAtTime: "ADMIN" | "STAFF";
  discardedSeeds?: number;
  createdAt: string;
  generatedInventory?: Inventory;
  inventory?: Inventory;
}

export const GerminationService = {
  async getAll(params?: any): Promise<Germination[]> {
    const parsed = extractServiceParams<{
      nurseryId?: string;
      customerId?: string;
      customerPhone?: string;
    }>(params);
    const res = await api.get(apiPath("/germination"), {
      params: withScopedParams(parsed, { includeCustomerIdentity: true }),
    });
    const data = unwrap(res);
    if (Array.isArray(data)) return withResolvedImagesDeep(data);
    if (Array.isArray(data?.data)) return withResolvedImagesDeep(data.data);
    return [];
  },

  create(payload: {
    sowingId: string;
    germinatedSeeds: number;
    discardedSeeds?: number;
  }): Promise<Germination> {
    return api.post(apiPath("/germination"), payload).then(unwrap);
  },
};
