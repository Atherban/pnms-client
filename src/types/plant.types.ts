export interface Plant {
  _id: string;
  name: string;
  category?: string;
  price: number;
  quantityAvailable: number;
  imageUrl?: string;
  images?: { fileName?: string; url?: string; path?: string }[];
  createdBy?: string;
}

export interface PlantTypeGrowthStage {
  stage: "SEED" | "SOWN" | "GERMINATED" | "HARDENED" | "READY_FOR_SALE";
  dayFrom: number;
  dayTo: number;
}

export interface PlantType {
  _id: string;
  id?: string;
  name: string;
  category?: string;
  variety?: string;
  lifecycleDays?: number;
  sellingPrice?: number;
  minStockLevel?: number;
  defaultCostPrice?: number;
  expectedSeedQtyPerBatch?: number;
  expectedSeedUnit?: string;
  description?: string;
  growthStages?: PlantTypeGrowthStage[];
  imageUrl?: string;
  images?: { fileName?: string; url?: string; path?: string }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePlantPayload {
  name: string;
  category: string;
  price: number;
  quantityAvailable: number;
}

export interface UpdateQuantityPayload {
  quantity: number;
}
