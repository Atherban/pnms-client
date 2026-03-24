import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, apiPath, unwrap } from "./api";
import { withScopedParams } from "./access-scope.service";
import {
  ApiPaymentMode,
  ApiPaymentVerificationAction,
} from "../constants/api-enums";
import { getApiList, getApiPayload } from "./api-contract.service";
import {
  appendFormFieldIfDefined,
  appendMultipartFile,
  type MultipartFile,
  sendMultipart,
} from "./multipart-upload.service";
import { SalesService } from "./sales.service";
import type { DueSale, PaymentProof, PaymentTransaction } from "../types/payment.types";
import { toImageUrl } from "../utils/image";

const PAYMENT_PROOF_CACHE_KEY = "pnms_payment_proofs_cache";
const toFileName = (uri?: string) => {
  const value = String(uri || "").trim();
  if (!value) return undefined;
  const parts = value.split(/[\\/]/).filter(Boolean);
  const last = parts[parts.length - 1];
  return last || undefined;
};

const toNumber = (value: unknown) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const hasDefinedNumber = (value: unknown) =>
  value !== null && value !== undefined && Number.isFinite(Number(value));

const clamp = (
  value: number,
  min = 0,
  max = Number.POSITIVE_INFINITY,
) => Math.min(Math.max(value, min), max);

const normalizePhone = (value?: string) => (value || "").replace(/[^\d]/g, "");
const isVerifiedPaymentStatus = (status?: string) => {
  const value = String(status || "").toUpperCase();
  return (
    value === "VERIFIED" ||
    value === "APPROVED" ||
    value === "ACCEPTED" ||
    value === "PAID" ||
    value === "SUCCESS"
  );
};

const normalizeVerificationStatus = (status?: string) => {
  const value = String(status || "").toUpperCase();
  if (value === "APPROVED" || value === "VERIFIED" || value === "ACCEPTED") {
    return "VERIFIED" as const;
  }
  if (value === "REJECTED") return "REJECTED" as const;
  if (value === "CANCELLED") return "CANCELLED" as const;
  if (value === "SYNC_QUEUED") return "SYNC_QUEUED" as const;
  return "PENDING_VERIFICATION" as const;
};

const resolveTransactionStatus = (tx: any) => {
  const explicitStatus = normalizeVerificationStatus(tx?.status);
  if (tx?.status) return explicitStatus;
  if (tx?.verifiedAt || tx?.verifiedBy) return "VERIFIED" as const;
  if (tx?.rejectionReason || tx?.rejectedAt || tx?.rejectedBy) {
    return "REJECTED" as const;
  }
  return "PENDING_VERIFICATION" as const;
};

const inferGrossAmount = (sale: any) => {
  const grossAmount = toNumber(
    sale?.grossAmount ??
      sale?.grandTotal ??
      sale?.finalAmount ??
      sale?.billAmount ??
      sale?.totalAmount,
  );
  if (grossAmount > 0) return grossAmount;

  const items = Array.isArray(sale?.items) ? sale.items : [];
  return items.reduce(
    (sum: number, item: any) =>
      sum +
      toNumber(item?.quantity) *
        toNumber(item?.priceAtSale ?? item?.unitPrice ?? item?.price),
    0,
  );
};

const inferNetAmount = (sale: any) => {
  const net = toNumber(sale?.netAmount);
  if (net > 0) return net;
  const gross = inferGrossAmount(sale);
  const discount = clamp(toNumber(sale?.discountAmount), 0, gross);
  return Math.max(0, gross - discount);
};

const inferPaidAmount = (sale: any) => {
  const netAmount = inferNetAmount(sale);
  const paidRaw = sale?.paidAmount ?? sale?.amountPaid;
  if (hasDefinedNumber(paidRaw)) {
    return clamp(Math.max(0, toNumber(paidRaw)), 0, netAmount);
  }

  const paymentRows = Array.isArray(sale?.payments)
    ? sale.payments
    : Array.isArray(sale?.paymentTransactions)
      ? sale.paymentTransactions
      : [];
  const verifiedPaymentsSum = paymentRows.reduce((sum: number, row: any) => {
    const amount = Math.max(0, toNumber(row?.amount));
    const txStatus = String(row?.status || "").toUpperCase();
    if (!txStatus) return sum + amount;
    return isVerifiedPaymentStatus(txStatus) ? sum + amount : sum;
  }, 0);
  if (verifiedPaymentsSum > 0) return clamp(verifiedPaymentsSum, 0, netAmount);

  const paymentStatus = String(sale?.paymentStatus || "").toUpperCase();
  if (
    paymentStatus === "PAID" ||
    paymentStatus === "FULLY_PAID" ||
    paymentStatus === "COMPLETED" ||
    paymentStatus === "VERIFIED"
  ) {
    return netAmount;
  }
  if (paymentStatus === "PARTIALLY_PAID" || paymentStatus === "PARTIAL") {
    const dueRaw = sale?.dueAmount;
    if (hasDefinedNumber(dueRaw)) {
      return clamp(netAmount - Math.max(0, toNumber(dueRaw)), 0, netAmount);
    }
  }
  return 0;
};

const inferTransactions = (sale: any): PaymentTransaction[] => {
  const transactions = Array.isArray(sale?.payments)
    ? sale.payments
    : Array.isArray(sale?.paymentTransactions)
      ? sale.paymentTransactions
      : [];

  return transactions.map((tx: any, index: number) => ({
    id: String(tx?._id || tx?.id || `${sale?._id}_${index}`),
    amount: toNumber(tx?.amount),
    mode: tx?.mode || tx?.paymentMode,
    createdAt: tx?.createdAt || sale?.updatedAt || sale?.createdAt || new Date().toISOString(),
    reference: tx?.transactionRef || tx?.reference,
    utrNumber: tx?.utrNumber || tx?.utr || tx?.upiUtr,
    paymentAt: tx?.paymentAt || tx?.paidAt || tx?.transactionAt,
    status: resolveTransactionStatus(tx),
    screenshotUri: toImageUrl(tx?.proofUrl || tx?.screenshotUri),
    rejectionReason: tx?.rejectionReason,
  }));
};

const getItemPlantNames = (sale: any): string[] => {
  if (!Array.isArray(sale?.items)) return [];
  const names: string[] = sale.items
    .map((item: any) => {
      const name =
        item?.plantTypeName ??
        item?.inventoryLabel ??
        item?.inventory?.plantType?.name ??
        item?.inventoryId?.plantType?.name ??
        item?.plantType?.name ??
        item?.name;
      return typeof name === "string" ? name : "";
    })
    .filter((name: string): name is string => Boolean(name));
  return Array.from(new Set(names));
};

const resolveEntityImage = (entity: any): string | undefined => {
  if (!entity || typeof entity !== "object") return undefined;

  const direct = toImageUrl(
    entity.imageUrl ??
      entity.image ??
      entity.fileUrl ??
      entity.url ??
      entity.path ??
      entity.fileName,
  );
  if (direct) return direct;

  const images = Array.isArray(entity.images) ? entity.images : [];
  for (const img of images) {
    const uri = toImageUrl(
      img?.imageUrl ?? img?.fileUrl ?? img?.url ?? img?.path ?? img?.fileName,
    );
    if (uri) return uri;
  }

  return undefined;
};

const inferSaleImage = (sale: any): string | undefined => {
  if (Array.isArray(sale?.items)) {
    for (const item of sale.items) {
      const candidates = [
        item?.plantImage ? { imageUrl: item.plantImage } : null,
        item?.plantTypeName
          ? {
              name: item.plantTypeName,
              imageUrl: item.plantImage,
            }
          : null,
        item?.inventory?.plantType,
        item?.inventoryId?.plantType,
        item?.plantType,
        item?.inventory,
        item?.inventoryId,
        item,
      ];
      for (const candidate of candidates) {
        const uri = resolveEntityImage(candidate);
        if (uri) return uri;
      }
    }
  }

  return resolveEntityImage(sale?.plantType) ?? resolveEntityImage(sale);
};

const toDueSale = (sale: any): DueSale => {
  const totalAmount = Math.max(0, inferNetAmount(sale));
  const paidAmount = clamp(Math.max(0, inferPaidAmount(sale)), 0, totalAmount);
  const hasDueAmount = hasDefinedNumber(sale?.dueAmount);
  const dueFromServer = Math.max(0, toNumber(sale?.dueAmount));
  let dueAmount = clamp(
    hasDueAmount ? dueFromServer : totalAmount - paidAmount,
    0,
    totalAmount,
  );
  if (Math.abs(totalAmount - (paidAmount + dueAmount)) > 0.01) {
    dueAmount = clamp(totalAmount - paidAmount, 0, totalAmount);
  }
  const customerObj = sale?.customer || sale?.customerDetails || {};
  const customerName =
    customerObj?.name ||
    sale?.customerName ||
    sale?.buyerName ||
    sale?.name ||
    "Walk-in Customer";
  const customerPhone =
    customerObj?.phone ||
    customerObj?.phoneNumber ||
    sale?.customerPhone ||
    sale?.phoneNumber ||
    sale?.mobileNumber;
  const customerId =
    customerObj?._id ||
    customerObj?.id ||
    sale?.customerId ||
    sale?.buyerId;
  const itemNames = getItemPlantNames(sale);
  const saleKind = String(sale?.saleKind || "").toUpperCase();
  const customerSeedBatch =
    sale?.customerSeedBatch && typeof sale.customerSeedBatch === "object"
      ? sale.customerSeedBatch
      : null;
  const servicePlantName =
    customerSeedBatch?.plantTypeId?.name ||
    sale?.serviceInvoice?.plantTypeName ||
    itemNames[0];
  const serviceUnits = Math.max(
    0,
    toNumber(
      customerSeedBatch?.germinatedQuantity ??
        customerSeedBatch?.seedsGerminated ??
        customerSeedBatch?.seedsSown ??
        0,
    ),
  );
  const itemTitle =
    saleKind === "SERVICE_SALE"
      ? servicePlantName
        ? `${servicePlantName} Service`
        : "Nursery Service Invoice"
      : itemNames.length > 0
        ? `${itemNames.slice(0, 2).join(", ")}${itemNames.length > 2 ? ` +${itemNames.length - 2}` : ""}`
        : "Nursery Invoice";
  const itemSubtitle =
    saleKind === "SERVICE_SALE"
      ? serviceUnits > 0
        ? `${serviceUnits.toLocaleString("en-IN")} seedlings ready`
        : "Service billing"
      : Array.isArray(sale?.items) && sale.items.length > 0
        ? `${sale.items.length} line item${sale.items.length > 1 ? "s" : ""}`
        : undefined;

  return {
    saleId: String(sale?._id || sale?.saleId || ""),
    customerId: customerId ? String(customerId) : undefined,
    customerName,
    customerPhone,
    itemTitle,
    itemSubtitle,
    saleKind: saleKind || undefined,
    imageUri: inferSaleImage(sale),
    issuedAt: sale?.saleDate || sale?.createdAt || new Date().toISOString(),
    totalAmount,
    paidAmount,
    dueAmount,
    status: dueAmount <= 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "DUE",
    transactions: inferTransactions(sale),
  };
};

const normalizeProof = (item: any): PaymentProof => ({
  id: String(item?._id || item?.id || ""),
  saleId: String(item?.sale?._id || item?.saleId?._id || item?.saleId || item?.sale || ""),
  saleNumber: item?.sale?.saleNumber || item?.saleId?.saleNumber || item?.saleNumber,
  customerId: String(
    item?.customer?._id ||
      item?.customerId?._id ||
      item?.customerId ||
      "",
  ) || undefined,
  customerName:
    item?.customer?.name ||
    item?.customerId?.name ||
    item?.sale?.customer?.name ||
    item?.saleId?.customer?.name ||
    item?.customerName ||
    "Walk-in Customer",
  customerPhone:
    item?.customer?.phone ||
    item?.customer?.phoneNumber ||
    item?.customer?.mobileNumber ||
    item?.customerId?.phone ||
    item?.customerId?.phoneNumber ||
    item?.customerId?.mobileNumber ||
    item?.sale?.customer?.phone ||
    item?.sale?.customer?.mobileNumber ||
    item?.saleId?.customer?.phone ||
    item?.saleId?.customer?.mobileNumber ||
    item?.customerPhone,
  amount: toNumber(item?.amount),
  mode: item?.mode || item?.paymentMode,
  utrNumber: item?.utrNumber || item?.utr || item?.upiUtr,
  paymentAt: item?.paymentAt || item?.paidAt || item?.transactionAt,
  screenshotUri: toImageUrl(item?.proofUrl || item?.screenshotUri),
  submittedAt: item?.submittedAt || item?.createdAt || new Date().toISOString(),
  status: item?.status
    ? normalizeVerificationStatus(item?.status)
    : item?.verifiedAt || item?.verifiedBy
      ? "VERIFIED"
      : item?.rejectionReason
        ? "REJECTED"
        : "PENDING_VERIFICATION",
  reviewerName: item?.verifiedBy?.name || item?.reviewerName,
  reviewedAt: item?.verifiedAt || item?.reviewedAt,
  rejectionReason: item?.rejectionReason,
  reference: item?.transactionRef || item?.reference,
});

const cacheProofs = async (proofs: PaymentProof[]) => {
  await AsyncStorage.setItem(PAYMENT_PROOF_CACHE_KEY, JSON.stringify(proofs));
};

const getCachedProofs = async (): Promise<PaymentProof[]> => {
  const raw = await AsyncStorage.getItem(PAYMENT_PROOF_CACHE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const PaymentService = {
  async getDueSalesForUser(user?: {
    id?: string;
    phoneNumber?: string;
    role?: string;
    nurseryId?: string;
  }): Promise<DueSale[]> {
    const sales = await SalesService.getAll({
      nurseryId: user?.nurseryId,
      customerPhone: user?.role === "CUSTOMER" ? user?.phoneNumber : undefined,
    });
    const userPhone = normalizePhone(user?.phoneNumber);

    const filtered = (Array.isArray(sales) ? sales : []).filter((sale: any) => {
      if (!user || user.role === "NURSERY_ADMIN" || user.role === "SUPER_ADMIN") {
        return true;
      }
      const saleCustomerId = String(
        sale?.customer?._id ||
          sale?.customer?.id ||
          sale?.customerId ||
          sale?.buyerId ||
          "",
      );
      const salePhone = normalizePhone(
        sale?.customer?.phone ||
          sale?.customer?.phoneNumber ||
          sale?.customerPhone ||
          sale?.phoneNumber ||
          sale?.mobileNumber,
      );

      if (user.id && saleCustomerId && saleCustomerId === String(user.id)) return true;
      if (userPhone && salePhone && userPhone === salePhone) return true;
      return false;
    });

    return filtered
      .map(toDueSale)
      .filter((item) => Boolean(item.saleId))
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  },

  async getCustomerDueOverview(user?: {
    id?: string;
    phoneNumber?: string;
    role?: string;
    nurseryId?: string;
  }) {
    const dues = await this.getDueSalesForUser(user);

    return dues.reduce(
      (acc, due) => {
        acc.total += due.totalAmount;
        acc.paid += due.paidAmount;
        acc.due += due.dueAmount;
        acc.partialCount += due.status === "PARTIAL" ? 1 : 0;
        acc.pendingVerification += due.transactions
          .filter(
            (t) =>
              t.status === "PENDING_VERIFICATION" || t.status === "SYNC_QUEUED",
          )
          .reduce((sum, t) => sum + t.amount, 0);
        return acc;
      },
      { total: 0, paid: 0, due: 0, partialCount: 0, pendingVerification: 0 },
    );
  },

  async submitPaymentProof(payload: {
    saleId: string;
    customerName: string;
    customerPhone?: string;
    amount: number;
    mode?: ApiPaymentMode;
    screenshotUri?: string;
    screenshotFile?: MultipartFile;
    reference?: string;
    utrNumber?: string;
    paymentAt?: string;
  }) {
    const requestPayload = {
      saleId: payload.saleId,
      amount: Math.max(0, toNumber(payload.amount)),
      mode: payload.mode || "UPI",
      transactionRef: payload.reference,
      utrNumber: payload.utrNumber,
      paymentAt: payload.paymentAt,
      paymentProofFileName: toFileName(payload.screenshotUri),
    };

    try {
      let data: any;
      if (payload.screenshotFile?.uri) {
        const formData = new FormData();
        appendFormFieldIfDefined(formData, "saleId", requestPayload.saleId);
        appendFormFieldIfDefined(formData, "amount", requestPayload.amount);
        appendFormFieldIfDefined(formData, "mode", requestPayload.mode);
        appendFormFieldIfDefined(formData, "transactionRef", requestPayload.transactionRef);
        appendFormFieldIfDefined(formData, "utrNumber", requestPayload.utrNumber);
        appendFormFieldIfDefined(formData, "paymentAt", requestPayload.paymentAt);
        appendFormFieldIfDefined(
          formData,
          "paymentProofFileName",
          requestPayload.paymentProofFileName,
        );
        appendMultipartFile(formData, "image", payload.screenshotFile);

        data = await sendMultipart<any>({
          path: "/payments",
          method: "POST",
          formData,
        });
      } else {
        const res = await api.post(apiPath("/payments"), requestPayload);
        data = getApiPayload<any>(unwrap<any>(res));
      }
      return normalizeProof(data);
    } catch {
      const cached = await getCachedProofs();
      const fallback: PaymentProof = {
        id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        saleId: payload.saleId,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        amount: requestPayload.amount,
        mode: requestPayload.mode,
        utrNumber: payload.utrNumber,
        paymentAt: payload.paymentAt,
        screenshotUri: payload.screenshotUri,
        submittedAt: new Date().toISOString(),
        status: "SYNC_QUEUED",
        reference: payload.reference,
      };
      await cacheProofs([fallback, ...cached]);
      return fallback;
    }
  },

  async recordWalkInPayment(payload: {
    saleId: string;
    amount: number;
    mode: ApiPaymentMode;
    utrNumber?: string;
    transactionRef?: string;
    paymentAt?: string;
  }) {
    const requestPayload = {
      saleId: payload.saleId,
      amount: Math.max(0, toNumber(payload.amount)),
      mode: payload.mode,
      utrNumber: payload.utrNumber?.trim() || undefined,
      transactionRef: payload.transactionRef?.trim() || undefined,
      paymentAt: payload.paymentAt,
      autoVerify: true,
    };
    const res = await api.post(apiPath("/payments"), requestPayload);
    return getApiPayload<any>(unwrap<any>(res));
  },

  async listPaymentProofs(status?: PaymentProof["status"]) {
    try {
      const res = await api.get(apiPath("/payments"), {
        params: withScopedParams(status ? { status } : undefined),
      });
      const list = getApiList<any>(unwrap<any>(res));
      const normalized = list.map(normalizeProof);
      await cacheProofs(normalized);
      return normalized;
    } catch {
      const cached = await getCachedProofs();
      return status ? cached.filter((proof) => proof.status === status) : cached;
    }
  },

  async reviewPaymentProof(payload: {
    id: string;
    approve: boolean;
    reviewerName?: string;
    rejectionReason?: string;
  }) {
    const action: ApiPaymentVerificationAction = payload.approve ? "ACCEPT" : "REJECT";
    const requestPayload = {
      action,
      rejectionReason: payload.approve ? undefined : payload.rejectionReason,
    };

    await api.post(apiPath(`/payments/${payload.id}/verify`), requestPayload);

    const cached = await getCachedProofs();
    const updated = cached.map((proof) =>
      proof.id === payload.id
        ? {
            ...proof,
            status: (payload.approve ? "VERIFIED" : "REJECTED") as PaymentProof["status"],
            reviewerName: payload.reviewerName,
            reviewedAt: new Date().toISOString(),
            rejectionReason: payload.approve ? undefined : payload.rejectionReason,
          }
        : proof,
    );
    await cacheProofs(updated);
  },
};
