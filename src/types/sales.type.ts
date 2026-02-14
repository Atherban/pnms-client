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
  costAtSale?: number;
  profit?: number;
  batchDeductions?: {
    inventoryId?: string;
    batchId?: string;
    quantity: number;
    unitCost?: number;
  }[];
}

export interface Sale {
  _id: string;
  items: SaleItem[];
  totalAmount: number;
  totalCost?: number;
  totalProfit?: number;
  grossMarginPercent?: number;
  paymentMode: string;
  performedBy?:
    | string
    | {
        _id: string;
        name?: string;
        email?: string;
        role?: "ADMIN" | "STAFF" | "VIEWER";
      };
  customer?: {
    _id: string;
    name?: string;
    phone?: string;
  };
  status?: "COMPLETED" | "PENDING" | "CANCELLED" | string;
  saleDate?: string;
  notes?: string;
  roleAtTime: "ADMIN" | "STAFF";
  createdAt: string;
  updatedAt?: string;
}
