import { api, apiPath, unwrap } from "./api";

export type MarketplaceProduct = {
  plantTypeId: string;
  name: string;
  category: "VEGETABLE" | "FLOWER" | "FRUIT" | "HERB" | string;
  variety?: string;
  sellingPrice: number;
  images?: { fileName: string; uploadedAt?: string }[];
  expectedSeedQtyPerBatch?: number;
  expectedSeedUnit?: string;
  availableQuantity: number;
  totalQuantity?: number;
  quantityUnit?: "SEEDS" | "GRAM" | "KG" | "UNITS" | string;
  inventoryItemIds?: string[];
  growthStageCounts?: Record<string, number>;
  statusCounts?: Record<string, number>;
  inventoryItems?: {
    id: string;
    quantity: number;
    quantityUnit?: string;
    status?: string;
    growthStage?: string;
    receivedAt?: string;
    createdAt?: string;
  }[];
};

export const CustomerMarketplaceService = {
  listAvailableProducts: async (): Promise<MarketplaceProduct[]> => {
    const res = await api.get(apiPath("/inventory/marketplace/products"));
    return (unwrap<any>(res)?.data ?? []) as MarketplaceProduct[];
  },
};
