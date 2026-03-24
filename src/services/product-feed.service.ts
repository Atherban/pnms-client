import { api, apiPath, unwrap } from "./api";
import { withResolvedImagesDeep } from "../utils/image";

export type ProductFeedAvailability = {
  available: number;
  total: number;
  unit?: string;
  inStock: boolean;
};

export type ProductFeedItem = {
  id: string;
  sourceId?: string;
  type: "PLANT" | "SEED" | string;
  name: string;
  category?: string;
  price?: number | null;
  image?: string | null;
  images?: { fileName: string; uploadedAt?: string }[];
  availability: ProductFeedAvailability;
  meta?: Record<string, any>;
};

export type ProductFeedSection = {
  id: string;
  title: string;
  subtitle?: string;
  type?: "PLANT" | "SEED" | string;
  category?: string;
  items: ProductFeedItem[];
};

export type ProductFeedResponse = {
  items: ProductFeedItem[];
  sections: ProductFeedSection[];
  updatedAt?: string;
};

export const ProductFeedService = {
  async getCustomerFeed(): Promise<ProductFeedResponse> {
    const res = await api.get(apiPath("/product-feed"));
    const data = unwrap<any>(res) ?? {};
    return withResolvedImagesDeep({
      items: Array.isArray(data.items) ? data.items : [],
      sections: Array.isArray(data.sections) ? data.sections : [],
      updatedAt: data.updatedAt
    });
  }
};
