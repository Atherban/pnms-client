export interface SaleItem {
  plantId: string;
  quantity: number;
  priceAtSale: number;
}

export interface Sale {
  _id: string;
  items: SaleItem[];
  totalAmount: number;
  paymentMode: string;
  performedBy: string;
  roleAtTime: "ADMIN" | "STAFF";
  createdAt: string;
}
