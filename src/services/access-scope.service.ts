import { useAuthStore } from "../stores/auth.store";
import type { Role } from "../types/role.types";

type AccessUser = {
  id?: string;
  role?: Role;
  nurseryId?: string;
  allowedNurseryIds?: string[];
  phoneNumber?: string;
};

export type AccessScope = {
  userId?: string;
  role?: Role;
  nurseryId?: string;
  allowedNurseryIds: string[];
  phoneNumber?: string;
};

export const getAccessScope = (userOverride?: AccessUser): AccessScope => {
  const user = userOverride || useAuthStore.getState().user || undefined;
  const allowedNurseryIds = Array.isArray(user?.allowedNurseryIds)
    ? user?.allowedNurseryIds.filter(Boolean)
    : [];
  const nurseryId =
    user?.nurseryId || (user?.role === "SUPER_ADMIN" ? allowedNurseryIds[0] : undefined);

  return {
    userId: user?.id,
    role: user?.role,
    nurseryId,
    allowedNurseryIds,
    phoneNumber: user?.phoneNumber,
  };
};

type ScopeOptions = {
  includeCustomerIdentity?: boolean;
  nurseryId?: string;
};

export const withScopedParams = (
  input?: Record<string, any>,
  options?: ScopeOptions,
  userOverride?: AccessUser,
) => {
  const scope = getAccessScope(userOverride);
  const params = { ...(input || {}) } as Record<string, any>;

  const forcedNurseryId = options?.nurseryId || params.nurseryId;
  if (scope.role === "SUPER_ADMIN") {
    if (forcedNurseryId) params.nurseryId = forcedNurseryId;
  } else if (scope.nurseryId) {
    params.nurseryId = scope.nurseryId;
  }

  if (options?.includeCustomerIdentity && scope.role === "CUSTOMER") {
    if (scope.userId) params.customerId = params.customerId || scope.userId;
    if (scope.phoneNumber) params.customerPhone = params.customerPhone || scope.phoneNumber;
  }

  return params;
};

export const extractServiceParams = <T extends Record<string, any>>(input: unknown): T | undefined => {
  if (!input || typeof input !== "object") return undefined;
  const candidate = input as Record<string, any>;

  // React Query passes context object when function ref is used as queryFn.
  if ("queryKey" in candidate || "signal" in candidate || "client" in candidate) {
    return undefined;
  }

  return candidate as T;
};

export const isNurseryAllowed = (
  nurseryId: string | undefined,
  userOverride?: AccessUser,
) => {
  if (!nurseryId) return false;
  const scope = getAccessScope(userOverride);
  if (scope.role === "SUPER_ADMIN") {
    if (!scope.allowedNurseryIds.length) return true;
    return scope.allowedNurseryIds.includes(nurseryId);
  }
  return nurseryId === scope.nurseryId;
};
