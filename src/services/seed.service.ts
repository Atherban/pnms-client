// services/seed.service.ts
import type { CreateSeedPayload, Seed } from "../types/seed.types";
import { api, apiPath, unwrap } from "./api";
import { extractServiceParams, withScopedParams } from "./access-scope.service";
import { withResolvedImage } from "../utils/image";
import { normalizeQuantityUnit } from "../utils/units";

export type { CreateSeedPayload, Seed };

const getDiscardedSeeds = (seed: any) => {
  const value =
    seed?.discardedSeeds ??
    seed?.discarded ??
    seed?.discardedQuantity ??
    seed?.wastedSeeds ??
    0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
};

const normalizeSeed = (seed: any) => ({
  ...withResolvedImage(seed),
  quantityUnit: normalizeQuantityUnit(
    seed?.quantityUnit ?? seed?.plantType?.expectedSeedUnit,
    "SEEDS",
  ),
  discardedSeeds: getDiscardedSeeds(seed),
  plantType: seed?.plantType ? withResolvedImage(seed.plantType) : seed?.plantType,
});

export const SeedService = {
  async getAll(params?: any) {
    const parsed = extractServiceParams<{
      nurseryId?: string;
      customerId?: string;
      customerPhone?: string;
    }>(params);
    const res = await api.get(apiPath("/seeds"), {
      params: withScopedParams(parsed, { includeCustomerIdentity: true }),
    });
    const data = unwrap(res);

    if (Array.isArray(data)) {
      return data.map((seed: any) => normalizeSeed(seed));
    }

    if (data && typeof data === "object" && Array.isArray((data as any).data)) {
      return {
        ...(data as any),
        data: (data as any).data.map((seed: any) => normalizeSeed(seed)),
      };
    }

    return data ?? [];
  },

  async getById(id: string) {
    const res = await api.get(apiPath(`/seeds/${id}`));
    const data = unwrap(res);
    const payloadCandidates = [
      data,
      (data as any)?.data,
      (data as any)?.seed,
      (data as any)?.item,
      (data as any)?.result,
    ];
    const payload =
      payloadCandidates.find(
        (candidate) =>
          candidate && typeof candidate === "object" && !Array.isArray(candidate),
      ) ?? data;

    if (!payload || typeof payload !== "object") {
      return payload;
    }

    return normalizeSeed(payload);
  },

  async create(payload: CreateSeedPayload) {
    const res = await api.post(apiPath("/seeds"), payload);
    return unwrap(res);
  },

  async update(id: string, payload: any) {
    const res = await api.patch(apiPath(`/seeds/${id}`), payload);
    return unwrap(res);
  },

  async delete(id: string) {
    const res = await api.delete(apiPath(`/seeds/${id}`));
    return unwrap(res);
  },
};
