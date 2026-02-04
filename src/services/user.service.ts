import { api } from "./api";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF" | "VIEWER";
  isActive: boolean;
}

export interface PaginatedUsers {
  users: User[];
  total: number;
}

export const UserService = {
  async getAll(page = 1, limit = 10): Promise<PaginatedUsers> {
    const res = await api.get(`/users?page=${page}&limit=${limit}`);

    if (Array.isArray(res)) {
      return { users: res, total: res.length };
    }

    return {
      users: res.data,
      total: res.total,
    };
  },

  create(payload: {
    name: string;
    email: string;
    password: string;
    role: User["role"];
  }) {
    return api.post("/users", payload);
  },

  updateRole(userId: string, role: User["role"]) {
    return api.patch(`/users/${userId}`, { role });
  },

  setActive(userId: string, isActive: boolean) {
    return api.patch(`/users/${userId}`, { isActive });
  },
};
