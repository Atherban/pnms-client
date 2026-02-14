export interface Plant {
  _id: string;
  name: string;
  category?: string;
  price: number;
  quantityAvailable: number;
  imageUrl?: string;
  createdBy?: string;
}

export interface PlantTypeGrowthStage {
  stage: string;
  days?: number;
  notes?: string;
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
  growthStages?: string[] | PlantTypeGrowthStage[];
  imageUrl?: string;
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
