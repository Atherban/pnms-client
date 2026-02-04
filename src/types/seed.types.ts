export interface Seed {
  _id: string;
  name: string;
  supplierName: string;
  totalPurchased: number;
  purchaseDate: string;
  expiryDate: string;
}

export interface CreateSeedPayload {
  name: string;
  supplierName: string;
  totalPurchased: number;
  purchaseDate: string;
  expiryDate: string;
}
