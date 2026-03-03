// services/sowing.service.ts
import { api, apiPath, unwrap } from "./api";
import { extractServiceParams, withScopedParams } from "./access-scope.service";
import { withResolvedImagesDeep } from "../utils/image";

export interface Sowing {
  _id: string;
  seedId?:
    | {
        _id: string;
        name: string;
        plantType?: { _id: string; name: string };
      }
    | string;
  plantType?: { _id?: string; name?: string };
  customerId?:
    | {
        _id?: string;
        name?: string;
        mobileNumber?: string;
      }
    | string;
  customerSeedBatch?:
    | string
    | {
        _id?: string;
        seedQuantity?: number;
        seedsSown?: number;
        seedsGerminated?: number;
        seedsDiscarded?: number;
        status?: string;
        estimatedPickupDate?: string;
      };
  quantity: number;
  quantityGerminated?: number;
  quantityDiscarded?: number;
  performedBy?: { _id: string; name: string; role: "ADMIN" | "STAFF" };
  roleAtTime?: "ADMIN" | "STAFF";
  createdAt: string;
}

const normalizeSowing = (s: any): Sowing => {
  const normalized = withResolvedImagesDeep(s);
  const { seed, seedId: rawSeedId, ...rest } = normalized;
  const seedObj =
    typeof rawSeedId === "object"
      ? rawSeedId
      : typeof seed === "object"
        ? seed
        : undefined;

  const plantTypeObj =
    seedObj?.plantType ??
    normalized?.customerSeedBatch?.plantTypeId ??
    normalized.plantType ??
    normalized.plantTypeId ??
    normalized.plantTypeRef ??
    undefined;

  const quantity =
    Number(
      rest.quantity ??
        rest.totalSeeds ??
        rest.seedsSown ??
        rest.quantitySown ??
        rest.seedQuantity ??
        0,
    ) || 0;

  const seedName =
    seedObj?.name ??
    rest.seedName ??
    seed?.name ??
    rest.seedLabel ??
    "Unknown Seed";

  const plantTypeName =
    plantTypeObj?.name ??
    rest.plantTypeName ??
    rest.plantTypeLabel ??
    "Unknown Plant";

  return {
    ...rest,
    quantity,
    seedId:
      seedObj ||
      (typeof rawSeedId === "string"
        ? { _id: rawSeedId, name: seedName, plantType: plantTypeObj }
        : seedName
          ? { _id: rawSeedId ?? "", name: seedName, plantType: plantTypeObj }
          : undefined),
    plantType: plantTypeObj ?? (plantTypeName ? { name: plantTypeName } : undefined),
  };
};

export const SowingService = {
  async create(payload: {
    seedId?: string;
    customerSeedBatchId?: string;
    quantity: number;
    customerId?: string;
  }) {
    const res = await api.post(apiPath("/sowing"), payload);
    return unwrap(res);
  },

  async getAll(params?: any) {
    const parsed = extractServiceParams<{
      nurseryId?: string;
      customerId?: string;
      customerPhone?: string;
    }>(params);
    const res = await api.get(apiPath("/sowing"), {
      params: withScopedParams(parsed, { includeCustomerIdentity: true }),
    });
    const data = unwrap(res);
    const list = Array.isArray(data) ? data : data?.data ?? [];
    return list.map(normalizeSowing);
  },

  async getById(id: string): Promise<Sowing> {
    const res = await api.get(apiPath(`/sowing/${id}`));
    const data = unwrap(res);
    const record = data?.data ?? data;
    return normalizeSowing(record);
  },
};
