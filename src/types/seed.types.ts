export interface Seed {
  _id: string;
  name: string;
  plantType?: { _id: string; name: string; category?: string; variety?: string };
  supplierName?: string;
  totalPurchased?: number;
  purchaseDate?: string;
  expiryDate?: string;
  quantityInStock?: number;
  minStockLevel?: number;
  category?: string;
}

export interface CreateSeedPayload {
  name: string;
  plantType: string;
  supplierName?: string;
  totalPurchased?: number;
  purchaseDate?: string;
  expiryDate?: string;
}
