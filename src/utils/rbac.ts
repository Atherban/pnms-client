import type { Role } from "../types/role.types";

export const isAdmin = (role?: Role | null) => role === "ADMIN";
export const canWritePlantType = (role?: Role | null) => role === "ADMIN";
export const canWriteOperational = (role?: Role | null) => role === "STAFF";
export const canViewProfit = (role?: Role | null) => role === "ADMIN";
export const canManageUsers = (role?: Role | null) => role === "ADMIN";
export const canManageSeeds = (role?: Role | null) => role === "STAFF";
export const canManageSowing = (role?: Role | null) => role === "STAFF";
export const canManageGermination = (role?: Role | null) => role === "STAFF";
export const canManagePurchasedInventory = (role?: Role | null) => role === "STAFF";
export const canManageSales = (role?: Role | null) => role === "STAFF";
export const canManageCustomers = (role?: Role | null) => role === "STAFF";
export const canManageExpenses = (role?: Role | null) => role === "STAFF";
export const canManageLabours = (role?: Role | null) => role === "STAFF";

export const canReadPlantTypes = (role?: Role | null) =>
  role === "ADMIN" || role === "STAFF" || role === "VIEWER";
export const canReadSeeds = canReadPlantTypes;
export const canReadSowing = canReadPlantTypes;
export const canReadGermination = canReadPlantTypes;
export const canReadInventory = canReadPlantTypes;
export const canReadSales = canReadPlantTypes;
export const canReadCustomers = canReadPlantTypes;
export const canReadExpenses = canReadPlantTypes;
export const canReadLabours = canReadPlantTypes;
