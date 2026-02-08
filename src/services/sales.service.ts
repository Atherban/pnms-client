import { api } from "./api";

export interface SaleItem {
  plantId: string;
  quantity: number;
}

export interface Sale {
  _id: string;
  items: {
    plantId: { _id: string; name: string };
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  soldBy: {
    _id: string;
    name: string;
    role: "STAFF" | "ADMIN";
  };
  createdAt: string;
}

export const SalesService = {
  create(payload: { items: SaleItem[] }): Promise<Sale> {
    return api.post("/sales", payload);
  },

  getAll(): Promise<Sale[]> {
    return api.get("/sales");
  },
};
