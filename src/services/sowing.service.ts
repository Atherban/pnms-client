// services/sowing.service.ts
import { api, apiPath, unwrap } from "./api";

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
  quantity: number;
  performedBy?: { _id: string; name: string; role: "ADMIN" | "STAFF" };
  roleAtTime?: "ADMIN" | "STAFF";
  createdAt: string;
}

export const SowingService = {
  async create(payload: { seedId: string; quantity: number }) {
    const res = await api.post(apiPath("/sowing"), payload);
    return unwrap(res);
  },

  async getAll() {
    const res = await api.get(apiPath("/sowing"));
    const data = unwrap(res);
    const list = Array.isArray(data) ? data : data?.data ?? [];

    return list.map((s: any) => {
      const seedObj =
        typeof s.seedId === "object"
          ? s.seedId
          : typeof s.seed === "object"
            ? s.seed
            : undefined;

      const plantTypeObj =
        seedObj?.plantType ??
        s.plantType ??
        s.plantTypeId ??
        s.plantTypeRef ??
        undefined;

      const quantity =
        Number(
          s.quantity ??
            s.totalSeeds ??
            s.seedsSown ??
            s.quantitySown ??
            s.seedQuantity ??
            0,
        ) || 0;

      const seedName =
        seedObj?.name ??
        s.seedName ??
        s.seed?.name ??
        s.seedLabel ??
        "Unknown Seed";

      const plantTypeName =
        plantTypeObj?.name ??
        s.plantTypeName ??
        s.plantTypeLabel ??
        "Unknown Plant";

      return {
        ...s,
        quantity,
        seedId:
          seedObj ||
          (typeof s.seedId === "string"
            ? { _id: s.seedId, name: seedName, plantType: plantTypeObj }
            : seedName
              ? { _id: s.seedId ?? "", name: seedName, plantType: plantTypeObj }
              : undefined),
        plantType: plantTypeObj ?? (plantTypeName ? { name: plantTypeName } : undefined),
      };
    });
  },
};
