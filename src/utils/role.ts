import type { ApiRole, Role } from "../types/role.types";

export const normalizeRole = (role?: ApiRole | string | null): Role => {
  switch (role) {
    case "SUPER_ADMIN":
      return "SUPER_ADMIN";
    case "NURSERY_ADMIN":
    case "ADMIN":
      return "NURSERY_ADMIN";
    case "STAFF":
      return "STAFF";
    case "CUSTOMER":
    case "VIEWER":
      return "CUSTOMER";
    default:
      return "CUSTOMER";
  }
};

export const isRole = (role: string, expected: Role) => normalizeRole(role) === expected;
