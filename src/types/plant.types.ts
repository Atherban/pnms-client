export interface Plant {
  _id: string;
  name: string;
  category?: string;
  price: number;
  quantityAvailable: number;
  imageUrl?: string;
  createdBy?: string;
}

export interface CreatePlantPayload {
  name: string;
  category: string;
  price: number;
  quantityAvailable: number;
}

export interface UpdateQuantityPayload {
  quantity: number;
}
