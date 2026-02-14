// services/plant-type.service.ts
import { api, apiPath, unwrap } from "./api";
import type { PlantType } from "../types/plant.types";

export interface PlantTypePayload {
  name: string;
  category: string;
  variety?: string;
  lifecycleDays?: number;
  sellingPrice: number;
  minStockLevel?: number;
  defaultCostPrice?: number;
  growthStages?: string[];
}

export const PlantTypeService = {
  async getAll(): Promise<PlantType[]> {
    const res = await api.get(apiPath("/plant-types"));
    const data = unwrap(res);
    const candidates = [
      data,
      data?.data,
      data?.data?.data,
      data?.items,
      data?.results,
      data?.plantTypes,
      data?.plant_types,
      data?.plants,
      data?.list,
      data?.docs,
      data?.rows,
    ];

    const list =
      candidates.find((candidate) => Array.isArray(candidate)) ?? [];

    return (list as PlantType[]).map((pt: any) => ({
      ...pt,
      id: pt?._id ?? pt?.id,
    }));
  },

  async getById(id: string) {
    const res = await api.get(apiPath(`/plant-types/${id}`));
    return unwrap(res);
  },

  async create(payload: PlantTypePayload) {
    const res = await api.post(apiPath("/plant-types"), payload);
    return unwrap(res);
  },

  async update(id: string, payload: Partial<PlantTypePayload>) {
    const res = await api.patch(apiPath(`/plant-types/${id}`), payload);
    return unwrap(res);
  },

  async delete(id: string) {
    const res = await api.delete(apiPath(`/plant-types/${id}`));
    return unwrap(res);
  },

  async uploadImage(id: string, file: FormData) {
    const res = await api.post(apiPath(`/plant-types/${id}/image`), file, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return unwrap(res);
  },
};
