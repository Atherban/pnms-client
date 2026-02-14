import type { PlantType } from "./plant.types";

export type InventorySourceType = "GERMINATION" | "PURCHASE" | string;

export interface Inventory {
  _id: string;
  plantType?: PlantType;
  quantity: number;
  sourceType?: InventorySourceType;
  sourceRef?: string | Record<string, unknown>;
  sourceModel?: string | Record<string, unknown>;
  initialQuantity?: number;
  unitCost?: number;
  growthStage?: string;
  receivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePurchasedInventoryPayload {
  plantType: string;
  quantity: number;
  unitCost: number;
  growthStage?: string;
  sourceType?: "PURCHASE";
  sourceRef?: string;
  sourceModel?: string;
  receivedAt?: string;
}
