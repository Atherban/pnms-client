import { api, apiPath, unwrap } from "./api";

export interface Plant {
  _id: string;
  name: string;
  category: string;
  price: number;
  quantityAvailable: number;
}

export const PlantService = {
  async getAll() {
    const res = await api.get(apiPath("/plants"));
    return unwrap(res);
  },

  async getById(id: string) {
    const res = await api.get(apiPath(`/plants/${id}`));
    return unwrap(res);
  },

  async create(payload: {
    name: string;
    category: string;
    price: number;
    quantityAvailable: number;
  }) {
    const res = await api.post(apiPath("/plants"), payload);
    return unwrap(res);
  },

  async update(
    id: string,
    payload: {
      name: string;
      category: string;
      price: number;
    },
  ) {
    const res = await api.patch(apiPath(`/plants/${id}`), payload);
    return unwrap(res);
  },
  async updateQuantity(id: string, quantityChange: number) {
    const res = await api.patch(apiPath(`/plants/${id}/quantity`), {
      quantityChange,
    });
    return unwrap(res);
  },

  async delete(id: string) {
    const res = await api.delete(apiPath(`/plants/${id}`));
    return unwrap(res);
  },
};
