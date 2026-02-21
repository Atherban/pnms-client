export interface Seed {
  _id: string;
  name: string;
  plantType?: {
    _id: string;
    name: string;
    category?: string;
    variety?: string;
    minStockLevel?: number;
    imageUrl?: string;
    images?: { fileName?: string; url?: string; path?: string }[];
  };
  supplierName?: string;
  totalPurchased?: number;
  seedsUsed?: number;
  discardedSeeds?: number;
  purchaseDate?: string;
  expiryDate?: string;
  quantityInStock?: number;
  minStockLevel?: number;
  category?: string;
  imageUrl?: string;
  images?: { fileName?: string; url?: string; path?: string }[];
}

export interface CreateSeedPayload {
  name: string;
  plantType: string;
  supplierName?: string;
  totalPurchased?: number;
  discardedSeeds?: number;
  purchaseDate?: string;
  expiryDate?: string;
}
