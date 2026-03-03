import type { PlantType } from "./plant.types";

export type InventorySourceType = "GERMINATION" | "PURCHASE" | string;

export interface Inventory {
  _id: string;
  plantType?: PlantType;
  quantity: number;
  quantityUnit?: string;
  sourceType?: InventorySourceType;
  sourceRef?: string | Record<string, unknown>;
  sourceModel?: string | Record<string, unknown>;
  initialQuantity?: number;
  unitCost?: number;
  unitPrice?: number;
  sellingPrice?: number;
  costPrice?: number;
  purchasePrice?: number;
  growthStage?: string;
  receivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePurchasedInventoryPayload {
  plantType: string;
  quantity: number;
  quantityUnit?: string;
  unitCost: number;
  growthStage?: string;
  sourceType?: "PURCHASE";
  sourceRef?: string;
  sourceModel?: string;
  receivedAt?: string;
}
