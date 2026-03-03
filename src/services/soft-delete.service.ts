import { api, apiPath, unwrap } from "./api";
import { withScopedParams } from "./access-scope.service";

export interface SoftDeletedAuditRow {
  id: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  nurseryId?: string;
  deletedBy?: string;
  deletedAt: string;
  purgeAt?: string;
  metadata?: Record<string, any>;
}

export interface SoftDeletedCollectionItem {
  id: string;
  collection: "users" | "nurseries" | "customers" | "expenses" | "plantTypes" | "seeds";
  nurseryId?: string;
  deletedAt?: string;
  entityLabel?: string;
  raw?: Record<string, any>;
}

const toText = (value: any): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    if (value.name) return String(value.name);
    if (value.title) return String(value.title);
    if (value.code) return String(value.code);
    if (value.email) return String(value.email);
    if (value.phoneNumber) return String(value.phoneNumber);
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
  }
  return undefined;
};

const isLikelyObjectId = (value?: string) =>
  Boolean(value && /^[a-fA-F0-9]{24}$/.test(value));

const pickFirstText = (...values: any[]) => {
  for (const value of values) {
    const text = toText(value);
    if (text) return text;
  }
  return undefined;
};

const toRefId = (value: any): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
  }
  return undefined;
};

const normalize = (row: any): SoftDeletedAuditRow => {
  const actorName = pickFirstText(
    row?.deletedBy?.name,
    row?.actorUserId?.name,
    row?.actor?.name,
    row?.actorName,
    row?.metadata?.actorName,
    row?.metadata?.deletedByName,
  );

  const rawActorText = pickFirstText(
    row?.deletedBy,
    row?.actorUserId,
    row?.actor,
    row?.metadata?.deletedBy,
    row?.metadata?.actorUserId,
  );

  const deletedBy = actorName || (isLikelyObjectId(rawActorText) ? undefined : rawActorText);

  const entityName = pickFirstText(
    row?.entityName,
    row?.name,
    row?.title,
    row?.before?.name,
    row?.before?.title,
    row?.before?.email,
    row?.after?.name,
    row?.after?.title,
    row?.after?.email,
    row?.metadata?.entityName,
    row?.metadata?.label,
    row?.metadata?.targetName,
  );

  const baseMetadata =
    row?.metadata && typeof row.metadata === "object" ? row.metadata : {};

  return {
    id: String(row?._id || row?.id || ""),
    entityType: String(row?.entityType || row?.model || row?.collection || "UNKNOWN"),
    entityId: String(row?.entityId || row?.recordId || row?.documentId || ""),
    entityName,
    nurseryId: toRefId(row?.nurseryId),
    deletedBy,
    deletedAt: row?.deletedAt || row?.occurredAt || row?.createdAt || new Date().toISOString(),
    purgeAt: row?.purgeAt || row?.autoDeleteAt,
    metadata: {
      ...baseMetadata,
      action: toText(row?.action) || toText(baseMetadata?.action),
      actorName: deletedBy,
      actorRole:
        toText(row?.actorUserId?.role) ||
        toText(baseMetadata?.actorRole) ||
        undefined,
      actorEmail:
        toText(row?.actorUserId?.email) ||
        toText(baseMetadata?.actorEmail) ||
        undefined,
    },
  };
};

const normalizeCollectionItem = (row: any): SoftDeletedCollectionItem => ({
  id: String(row?._id || row?.id || ""),
  collection: String(row?.collection || "users") as SoftDeletedCollectionItem["collection"],
  nurseryId: toRefId(row?.nurseryId),
  deletedAt: row?.deletedAt || row?.updatedAt || row?.createdAt,
  entityLabel:
    toText(row?.entityLabel) ||
    toText(row?.name) ||
    toText(row?.title) ||
    toText(row?.email) ||
    toText(row?.phoneNumber),
  raw: row?.raw && typeof row.raw === "object" ? row.raw : undefined,
});

export const SoftDeleteService = {
  async listAuditLogs(params?: {
    nurseryId?: string;
    entityType?: string;
    page?: number;
    limit?: number;
  }) {
    const res = await api.get(apiPath("/audit-logs/soft-deletes"), {
      params: withScopedParams(params),
    });
    const data = unwrap<any>(res);
    const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return list.map(normalize);
  },

  async clearAuditLogs(params?: {
    nurseryId?: string;
    entityType?: string;
    from?: string;
    to?: string;
  }) {
    const res = await api.delete(apiPath("/audit-logs/soft-deletes"), {
      params: withScopedParams(params),
    });
    return unwrap<any>(res);
  },

  async purgeExpired(params?: { nurseryId?: string; retentionDays?: number }) {
    const payload = {
      retentionDays: params?.retentionDays ?? 30,
      ...withScopedParams(params),
    };
    const res = await api.post(apiPath("/maintenance/soft-delete/purge"), payload);
    return unwrap<any>(res);
  },

  async listCollectionItems(params?: {
    nurseryId?: string;
    collection?: SoftDeletedCollectionItem["collection"];
    limit?: number;
  }) {
    const res = await api.get(apiPath("/maintenance/soft-delete/items"), {
      params: withScopedParams(params),
    });
    const root = unwrap<any>(res);
    const list = Array.isArray(root?.data) ? root.data : Array.isArray(root) ? root : [];
    return list.map(normalizeCollectionItem);
  },

  async hardDeleteItems(payload: {
    collection: SoftDeletedCollectionItem["collection"];
    ids: string[];
    nurseryId?: string;
  }) {
    const res = await api.post(apiPath("/maintenance/soft-delete/hard-delete"), payload);
    return unwrap<any>(res);
  },
};
