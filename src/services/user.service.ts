import { api, apiPath, unwrap } from "./api";

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
    const res = await api.get(
      apiPath(`/users?page=${page}&limit=${limit}`),
    );
    const data = unwrap(res);

    if (Array.isArray(data)) {
      return { users: data, total: data.length };
    }

    return {
      users: data?.users ?? data?.data ?? [],
      total: data?.total ?? data?.count ?? 0,
    };
  },

  create(payload: {
    name: string;
    email: string;
    password: string;
    role: User["role"];
  }) {
    return api.post(apiPath("/users"), payload).then(unwrap);
  },

  updateRole(userId: string, role: User["role"]) {
    return api.patch(apiPath(`/users/${userId}`), { role }).then(unwrap);
  },

  setActive(userId: string, isActive: boolean) {
    return api.patch(apiPath(`/users/${userId}`), { isActive }).then(unwrap);
  },
};
