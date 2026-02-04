import { api } from "./api";

export interface Plant {
  _id: string;
  name: string;
  category: string;
  price: number;
  quantityAvailable: number;
}

export const PlantService = {
  async getAll() {
    const res = await api.get("/plants");
    return res.data;
  },

  async getById(id: string) {
    const res = await api.get(`/plants/${id}`);
    return res.data;
  },

  async create(payload: {
    name: string;
    category: string;
    price: number;
    quantityAvailable: number;
  }) {
    const res = await api.post("/plants", payload);
    return res.data;
  },

  async update(
    id: string,
    payload: {
      name: string;
      category: string;
      price: number;
    },
  ) {
    const res = await api.patch(`/plants/${id}`, payload);
    return res.data;
  },
  async updateQuantity(id: string, quantityChange: number) {
    const res = await api.patch(`/plants/${id}/quantity`, { quantityChange });
    return res.data;
  },

  async delete(id: string) {
    const res = await api.delete(`/plants/${id}`);
    return res.data;
  },
};
