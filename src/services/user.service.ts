import { api, apiPath, unwrap } from "./api";
import { extractServiceParams, withScopedParams } from "./access-scope.service";
import { getApiList, getApiPayload } from "./api-contract.service";

export interface User {
  _id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  nurseryId?: string;
  role: "NURSERY_ADMIN" | "STAFF" | "CUSTOMER" | "SUPER_ADMIN";
  isActive: boolean;
}

export interface PaginatedUsers {
  users: User[];
  total: number;
}

export const UserService = {
  async getAll(
    page = 1,
    limit = 10,
    params?: any,
  ): Promise<PaginatedUsers> {
    const parsed = extractServiceParams<{ nurseryId?: string }>(params);
    const res = await api.get(
      apiPath(`/users?page=${page}&limit=${limit}`),
      { params: withScopedParams(parsed) },
    );
    const root = unwrap<any>(res);
    const list = getApiList<User>(root);
    if (Array.isArray(list) && list.length) {
      return {
        users: list,
        total:
          Number(root?.total ?? root?.count ?? (getApiPayload<any>(root)?.total ?? 0)) ||
          list.length,
      };
    }
    const data = getApiPayload<any>(root);

    return {
      users: data?.users ?? data?.data ?? [],
      total: data?.total ?? data?.count ?? 0,
    };
  },

  async getById(userId: string): Promise<User> {
    const res = await api.get(apiPath(`/users/${userId}`));
    return getApiPayload<User>(unwrap<any>(res));
  },

  create(payload: {
    name: string;
    email?: string;
    phoneNumber?: string;
    password: string;
    role: User["role"];
    nurseryId?: string;
  }) {
    return api
      .post(apiPath("/users"), payload)
      .then(unwrap)
      .then((root) => getApiPayload<User>(root));
  },

  updateRole(userId: string, role: User["role"]) {
    return api.patch(apiPath(`/users/${userId}`), { role }).then(unwrap);
  },

  update(userId: string, payload: Partial<Omit<User, "_id">>) {
    return api.patch(apiPath(`/users/${userId}`), payload).then(unwrap);
  },

  setActive(userId: string, isActive: boolean) {
    return api.patch(apiPath(`/users/${userId}`), { isActive }).then(unwrap);
  },

  remove(userId: string) {
    return api.delete(apiPath(`/users/${userId}`)).then(unwrap);
  },

  resetPasswordToDefault(userId: string, defaultPassword?: string) {
    return api
      .post(
        apiPath(`/users/${userId}/reset-password`),
        defaultPassword ? { defaultPassword } : {},
      )
      .then(unwrap);
  },
};
