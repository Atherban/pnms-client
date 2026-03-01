export type Role = "SUPER_ADMIN" | "NURSERY_ADMIN" | "STAFF" | "CUSTOMER";

export type LegacyRole = "ADMIN" | "VIEWER";

export type ApiRole = Role | LegacyRole;
