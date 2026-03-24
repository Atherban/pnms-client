import { api, apiPath, unwrap } from "./api";
import { getAccessScope } from "./access-scope.service";
import {
  appendFormFieldIfDefined,
  appendMultipartFile,
  MultipartFile,
  sendMultipart,
} from "./multipart-upload.service";
import type {
  NurseryPaymentConfig,
  NurseryPublicContact,
  NurseryPublicProfile,
} from "../types/public-profile.types";
import { toImageUrl } from "../utils/image";

const normalizeNurseryId = (nurseryId?: string) => (nurseryId || "").trim();
const getRootPayload = (payload: any) => payload?.data ?? payload;

const resolveNurseryId = (nurseryId?: string) => {
  const requested = normalizeNurseryId(nurseryId);
  const scope = getAccessScope();

  if (scope.role === "SUPER_ADMIN") {
    if (requested) return requested;
    if (scope.nurseryId) return scope.nurseryId;
    throw new Error("Nursery id is required for super admin.");
  }

  if (!scope.nurseryId) {
    throw new Error("Nursery context is missing.");
  }

  if (requested && requested !== scope.nurseryId) {
    throw new Error("NURSERY_ADMIN can only modify own nursery.");
  }

  return scope.nurseryId;
};

const normalizeContact = (item: any): NurseryPublicContact => ({
  id: String(item?._id || item?.id || ""),
  label: item?.label,
  phoneNumber: item?.phoneNumber || item?.phone,
  whatsappNumber: item?.whatsappNumber || item?.whatsappPhone,
  email: item?.email,
  address: item?.address,
  imageUrl: toImageUrl(item?.imageUrl || item?.image || item?.photo),
  qrImageUrl: toImageUrl(item?.qrImageUrl || item?.qrImage),
});

const normalizePaymentConfig = (settings: any): NurseryPaymentConfig => {
  const payment = settings?.paymentConfig || {};
  return {
    upiId: payment?.upiId,
    beneficiaryName: payment?.beneficiaryName,
    bankName: payment?.bankName,
    accountNumber: payment?.accountNumber,
    ifscCode: payment?.ifscCode,
    paymentNotes: payment?.paymentNotes || payment?.notes,
    qrImageUrl: toImageUrl(payment?.qrImageUrl || payment?.qrImage),
  };
};

const toProfile = (nurseryId: string, raw: any): NurseryPublicProfile => {
  const settings = raw?.settings || {};
  const branding = settings?.branding || raw?.branding || {};
  const contact = settings?.contact || settings?.contactDetails || {};
  const social = settings?.social || settings?.socialHandles || {};
  const contactList = Array.isArray(settings?.contactDetails)
    ? settings.contactDetails.map(normalizeContact)
    : Array.isArray(raw?.contactDetails)
      ? raw.contactDetails.map(normalizeContact)
      : [];
  const paymentConfig = normalizePaymentConfig(settings);

  return {
    nurseryId,
    name: raw?.name,
    code: raw?.code,
    phoneNumber: raw?.phoneNumber,
    paymentConfig,
    contactDetails: contactList,
    logoImageUrl: toImageUrl(
      branding?.logoImageUrl ||
        branding?.logoImage ||
        branding?.logoUrl ||
        branding?.logo ||
        raw?.logoImageUrl ||
        raw?.logoUrl ||
        raw?.logoImage ||
        raw?.logo,
    ),
    // Backward-compatible projections used in existing customer/admin screens.
    upiId: paymentConfig.upiId,
    qrImageUrl: paymentConfig.qrImageUrl,
    primaryPhone: contact?.primaryPhone || raw?.phoneNumber || contactList[0]?.phoneNumber,
    secondaryPhone: contact?.secondaryPhone,
    whatsappPhone: contact?.whatsappPhone || contactList[0]?.whatsappNumber,
    website: social?.website,
    facebook: social?.facebook,
    instagram: social?.instagram,
    youtube: social?.youtube,
    notes: settings?.customerNotes || settings?.notes || paymentConfig.paymentNotes,
    updatedAt: raw?.updatedAt || new Date().toISOString(),
    updatedBy: raw?.updatedBy?.name || raw?.updatedBy,
  };
};

const normalizeProfileResponse = (nurseryId: string, payload: any) => {
  const root = getRootPayload(payload);
  return toProfile(nurseryId, root);
};

const getContactListFromPayload = (payload: any): NurseryPublicContact[] => {
  const root = getRootPayload(payload);
  if (!root || typeof root !== "object") return [];

  if (Array.isArray(root?.contactDetails)) {
    return root.contactDetails.map(normalizeContact);
  }

  if (Array.isArray(root?.settings?.contactDetails)) {
    return root.settings.contactDetails.map(normalizeContact);
  }

  return [];
};

export const NurseryPublicProfileService = {
  async get(nurseryId?: string): Promise<NurseryPublicProfile> {
    const id = resolveNurseryId(nurseryId);
    const res = await api.get(apiPath(`/nurseries/${id}`), {
      headers: { "x-nursery-id": id },
    });
    return normalizeProfileResponse(id, unwrap<any>(res));
  },

  async updatePaymentConfig(
    payload: { nurseryId?: string } & Omit<NurseryPaymentConfig, "qrImageUrl">,
  ): Promise<NurseryPublicProfile> {
    const id = resolveNurseryId(payload.nurseryId);
    const requestPayload = {
      upiId: payload.upiId?.trim() || undefined,
      beneficiaryName: payload.beneficiaryName?.trim() || undefined,
      bankName: payload.bankName?.trim() || undefined,
      accountNumber: payload.accountNumber?.trim() || undefined,
      ifscCode: payload.ifscCode?.trim().toUpperCase() || undefined,
      paymentNotes: payload.paymentNotes?.trim() || undefined,
    };
    const res = await api.patch(apiPath(`/nurseries/${id}/payment-config`), requestPayload, {
      headers: { "x-nursery-id": id },
    });
    return normalizeProfileResponse(id, unwrap<any>(res));
  },

  async uploadPaymentQrImage(nurseryId: string | undefined, file: MultipartFile) {
    const id = resolveNurseryId(nurseryId);
    const formData = new FormData();
    appendMultipartFile(formData, "image", file);
    const payload = await sendMultipart<any>({
      path: `/nurseries/${id}/payment-config/qr-image`,
      method: "POST",
      formData,
      nurseryId: id,
    });

    const profile = normalizeProfileResponse(id, payload);
    return { qrImageUrl: profile.paymentConfig?.qrImageUrl || profile.qrImageUrl, raw: payload };
  },

  async uploadLogoImage(nurseryId: string | undefined, file: MultipartFile) {
    const id = resolveNurseryId(nurseryId);
    const formData = new FormData();
    appendMultipartFile(formData, "image", file);
    const payload = await sendMultipart<any>({
      path: `/nurseries/${id}/logo-image`,
      method: "POST",
      formData,
      nurseryId: id,
    });

    const profile = normalizeProfileResponse(id, payload);
    return { logoImageUrl: profile.logoImageUrl, raw: payload };
  },

  async createPublicContact(
    payload: {
      nurseryId?: string;
      label?: string;
      phoneNumber?: string;
      whatsappNumber?: string;
      email?: string;
      address?: string;
    },
    image?: MultipartFile,
  ): Promise<NurseryPublicContact> {
    const id = resolveNurseryId(payload.nurseryId);
    const formData = new FormData();
    appendFormFieldIfDefined(formData, "label", payload.label?.trim());
    appendFormFieldIfDefined(formData, "phoneNumber", payload.phoneNumber?.trim());
    appendFormFieldIfDefined(formData, "whatsappNumber", payload.whatsappNumber?.trim());
    appendFormFieldIfDefined(formData, "email", payload.email?.trim());
    appendFormFieldIfDefined(formData, "address", payload.address?.trim());
    appendMultipartFile(formData, "image", image);

    const data = await sendMultipart<any>({
      path: `/nurseries/${id}/public-contacts`,
      method: "POST",
      formData,
      nurseryId: id,
    });
    const contacts = getContactListFromPayload(data);
    if (contacts.length === 0) {
      throw new Error("Contact was created but response format was invalid");
    }
    return contacts[contacts.length - 1];
  },

  async updatePublicContact(
    payload: {
      nurseryId?: string;
      contactId: string;
      label?: string;
      phoneNumber?: string;
      whatsappNumber?: string;
      email?: string;
      address?: string;
    },
    image?: MultipartFile,
  ): Promise<NurseryPublicContact> {
    const id = resolveNurseryId(payload.nurseryId);
    const formData = new FormData();
    appendFormFieldIfDefined(formData, "label", payload.label?.trim());
    appendFormFieldIfDefined(formData, "phoneNumber", payload.phoneNumber?.trim());
    appendFormFieldIfDefined(formData, "whatsappNumber", payload.whatsappNumber?.trim());
    appendFormFieldIfDefined(formData, "email", payload.email?.trim());
    appendFormFieldIfDefined(formData, "address", payload.address?.trim());
    appendMultipartFile(formData, "image", image);

    const data = await sendMultipart<any>({
      path: `/nurseries/${id}/public-contacts/${encodeURIComponent(payload.contactId)}`,
      method: "PATCH",
      formData,
      nurseryId: id,
    });
    const contacts = getContactListFromPayload(data);
    const updated =
      contacts.find((item) => item.id === payload.contactId) || contacts[contacts.length - 1];
    if (!updated) {
      throw new Error("Contact was updated but response format was invalid");
    }
    return updated;
  },

  async uploadPublicContactQrImage(
    nurseryId: string | undefined,
    contactId: string,
    file: MultipartFile,
  ) {
    const id = resolveNurseryId(nurseryId);
    const formData = new FormData();
    appendMultipartFile(formData, "image", file);
    const data = await sendMultipart<any>({
      path: `/nurseries/${id}/public-contacts/${encodeURIComponent(contactId)}/qr-image`,
      method: "POST",
      formData,
      nurseryId: id,
    });
    const contacts = getContactListFromPayload(data);
    const updated = contacts.find((item) => item.id === contactId) || contacts[contacts.length - 1];
    if (!updated) {
      throw new Error("Contact QR was uploaded but response format was invalid");
    }
    return updated;
  },

  async deletePublicContact(nurseryId: string | undefined, contactId: string) {
    const id = resolveNurseryId(nurseryId);
    const res = await api.delete(
      apiPath(`/nurseries/${id}/public-contacts/${encodeURIComponent(contactId)}`),
      { headers: { "x-nursery-id": id } },
    );
    return unwrap<any>(res);
  },
};
