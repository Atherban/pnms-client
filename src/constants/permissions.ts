import { Role } from "../types/role.types";

export const PERMISSIONS: Record<Role, string[]> = {
  ADMIN: [
    "MANAGE_USERS",
    "MANAGE_PLANTS",
    "VIEW_PROFIT",
    "SALES",
    "SOWING",
  ],
  STAFF: ["SALES", "SOWING"],
  VIEWER: [],
};
