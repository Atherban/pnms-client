import { api, apiPath, unwrap } from "./api";

export interface Germination {
  _id: string;
  sowingId: {
    _id: string;
    seedId:
      | { _id: string; name: string; plantType?: { _id: string; name: string } }
      | string;
    plantId?: { _id: string; name: string };
    quantity: number;
  };
  germinatedSeeds: number;
  performedBy: {
    _id: string;
    name: string;
    role: "ADMIN" | "STAFF";
  };
  roleAtTime: "ADMIN" | "STAFF";
  createdAt: string;
}

export const GerminationService = {
  create(payload: {
    sowingId: string;
    germinatedSeeds: number;
  }): Promise<Germination> {
    return api.post(apiPath("/germination"), payload).then(unwrap);
  },
};
