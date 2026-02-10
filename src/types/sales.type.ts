export interface SaleItem {
  inventoryId?: string;
  inventory?: {
    _id: string;
    plantType?: { _id: string; name: string };
  };
  quantity: number;
  priceAtSale?: number;
  unitPrice?: number;
  price?: number;
}

export interface Sale {
  _id: string;
  items: SaleItem[];
  totalAmount: number;
  paymentMode: string;
  performedBy?: string;
  roleAtTime: "ADMIN" | "STAFF";
  createdAt: string;
}
