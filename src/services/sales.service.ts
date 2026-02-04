import { Sale } from "../types/sales.type";
import { api } from "./api";

export const SalesService = {
  getAll(): Promise<Sale[]> {
    return api.get("/sales");
  },

  getById(id: string): Promise<Sale> {
    return api.get(`/sales/${id}`);
  },
};
