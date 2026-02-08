import { api } from "./api";

/* ================================
   Types
================================ */

export interface Sowing {
  _id: string;
  seedId: {
    _id: string;
    name: string;
  };
  plantId: {
    _id: string;
    name: string;
  };
  quantity: number;
  performedBy: {
    _id: string;
    name: string;
    role: "ADMIN" | "STAFF";
  };
  roleAtTime: "ADMIN" | "STAFF";
  createdAt: string;
}

/* ================================
   Service
================================ */

export const SowingService = {
  /**
   * ADMIN only – fetch all sowing records
   */
  getAll(): Promise<Sowing[]> {
    return api.get("/sowing");
  },

  /**
   * STAFF + ADMIN – create sowing (transactional)
   */
  create(payload: {
    seedId: string;
    plantId: string;
    quantity: number;
  }): Promise<Sowing> {
    return api.post("/sowing", payload);
  },
};
