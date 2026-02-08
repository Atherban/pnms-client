import { api } from "./api";

/* ================================
   Types (AUTHORITATIVE)
================================ */

export interface Seed {
  _id: string;
  name: string;
  category: string;
  supplierName?: string;
  totalPurchased: number;
  quantityInStock: number; // must be returned by backend
  purchaseDate: string;
  expiryDate: string;
  createdAt: string;
  updatedAt: string;
}

/* ================================
   Service
================================ */

export const SeedService = {
  getAll(): Promise<Seed[]> {
    return api.get("/seeds");
  },

  getById(id: string): Promise<Seed> {
    return api.get(`/seeds/${id}`);
  },

  create(payload: {
    name: string;
    category: string;
    supplierName?: string;
    totalPurchased: number;
    purchaseDate: string;
    expiryDate: string;
  }): Promise<Seed> {
    return api.post("/seeds", payload);
  },

  update(
    id: string,
    payload: Partial<Omit<Seed, "_id" | "createdAt" | "updatedAt">>,
  ): Promise<Seed> {
    return api.patch(`/seeds/${id}`, payload);
  },

  delete(id: string): Promise<void> {
    return api.delete(`/seeds/${id}`);
  },
};
