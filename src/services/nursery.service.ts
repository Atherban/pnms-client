import { api, apiPath, unwrap } from "./api";
import { getApiList, getApiPayload } from "./api-contract.service";

export interface Nursery {
  id: string;
  name: string;
  code?: string;
  status?: "ACTIVE" | "SUSPENDED" | string;
  address?: string;
  settings?: {
    currency?: string;
    timezone?: string;
    paymentConfig?: {
      upiId?: string;
      qrImage?: string;
    };
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface NurseryAdminAssignment {
  id: string;
  adminUserId: string;
  nurseryId: string;
  name?: string;
  phoneNumber?: string;
  email?: string;
  isPrimary?: boolean;
}

export interface CreateNurseryPayload {
  name: string;
  code?: string;
  address?: string;
}

const normalize = (row: any): Nursery => ({
  id: String(row?._id || row?.id || ""),
  name: row?.name || "",
  code: row?.code,
  status: row?.status || "ACTIVE",
  address: row?.address,
  settings: row?.settings,
  createdAt: row?.createdAt,
  updatedAt: row?.updatedAt,
});

const normalizeAdmin = (row: any): NurseryAdminAssignment => ({
  id: String(row?._id || row?.id || row?.adminUserId?._id || row?.adminUserId || ""),
  adminUserId: String(
    row?.adminUserId?._id ||
      row?.adminUserId?.id ||
      row?.adminUserId ||
      row?.admin?._id ||
      row?.admin?.id ||
      row?._id ||
      row?.id ||
      "",
  ),
  nurseryId: String(row?.nurseryId || row?.nursery?._id || row?.nursery?.id || ""),
  name: row?.name || row?.adminUserId?.name || row?.admin?.name,
  phoneNumber: row?.phoneNumber || row?.adminUserId?.phoneNumber || row?.admin?.phoneNumber,
  email: row?.email || row?.adminUserId?.email || row?.admin?.email,
  isPrimary: Boolean(row?.isPrimary),
});

export const NurseryService = {
  async list() {
    const res = await api.get(apiPath("/nurseries"));
    const list = getApiList<any>(unwrap<any>(res));
    return list.map(normalize);
  },

  async getById(id: string) {
    const res = await api.get(apiPath(`/nurseries/${id}`));
    return normalize(getApiPayload<any>(unwrap<any>(res)));
  },

  async create(payload: CreateNurseryPayload) {
    const res = await api.post(apiPath("/nurseries"), payload);
    return normalize(getApiPayload<any>(unwrap<any>(res)));
  },

  async update(id: string, payload: Partial<Nursery>) {
    const res = await api.patch(apiPath(`/nurseries/${id}`), payload);
    return normalize(getApiPayload<any>(unwrap<any>(res)));
  },

  async remove(id: string) {
    const res = await api.delete(apiPath(`/nurseries/${id}`));
    return unwrap<any>(res);
  },

  async listAdmins(nurseryId: string) {
    const res = await api.get(apiPath(`/nurseries/${nurseryId}/admins`));
    const list = getApiList<any>(unwrap<any>(res));
    return list.map(normalizeAdmin);
  },

  async assignAdmin(nurseryId: string, payload: { adminUserId: string; isPrimary?: boolean }) {
    const res = await api.post(apiPath(`/nurseries/${nurseryId}/admins`), payload);
    return normalizeAdmin(getApiPayload<any>(unwrap<any>(res)));
  },

  async removeAdmin(nurseryId: string, adminId: string) {
    const res = await api.delete(apiPath(`/nurseries/${nurseryId}/admins/${adminId}`));
    return unwrap<any>(res);
  },
};
