import type { Role } from "../types/role.types";

export const isNurseryAdmin = (role?: Role | null) => role === "NURSERY_ADMIN";
export const isSuperAdmin = (role?: Role | null) => role === "SUPER_ADMIN";
export const canWritePlantType = (role?: Role | null) =>
  role === "NURSERY_ADMIN" || role === "SUPER_ADMIN";
export const canWriteOperational = (role?: Role | null) => role === "STAFF";
export const canViewProfit = (role?: Role | null) =>
  role === "NURSERY_ADMIN" || role === "SUPER_ADMIN";
export const canManageUsers = (role?: Role | null) =>
  role === "NURSERY_ADMIN" || role === "SUPER_ADMIN";
export const canManageSeeds = (role?: Role | null) => role === "STAFF";
export const canManageSowing = (role?: Role | null) => role === "STAFF";
export const canManageGermination = (role?: Role | null) => role === "STAFF";
export const canManagePurchasedInventory = (role?: Role | null) => role === "STAFF";
export const canManageSales = (role?: Role | null) => role === "STAFF";
export const canManageCustomers = (role?: Role | null) => role === "STAFF";
export const canManageExpenses = (role?: Role | null) => role === "STAFF";
export const canManageLabours = (role?: Role | null) => role === "STAFF";

export const canReadPlantTypes = (role?: Role | null) =>
  role === "NURSERY_ADMIN" ||
  role === "SUPER_ADMIN" ||
  role === "STAFF";
export const canReadSeeds = canReadPlantTypes;
export const canReadSowing = canReadPlantTypes;
export const canReadGermination = canReadPlantTypes;
export const canReadInventory = canReadPlantTypes;
export const canReadSales = (role?: Role | null) => canReadPlantTypes(role) || role === "CUSTOMER";
export const canReadCustomers = canReadSales;
export const canReadExpenses = canReadPlantTypes;
export const canReadLabours = canReadPlantTypes;
