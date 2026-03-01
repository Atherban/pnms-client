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

const normalizePhone = (value?: string) => (value || "").replace(/[^\d]/g, "");
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

const inferSaleAmount = (sale: any) => {
  const gross = toNumber(sale?.grandTotal ?? sale?.finalAmount ?? sale?.billAmount);
  if (gross > 0) return gross;
  const net = toNumber(sale?.netAmount);
  if (net > 0) return net;
  const total = toNumber(sale?.totalAmount);
  if (total > 0) return total;

  const items = Array.isArray(sale?.items) ? sale.items : [];
  return items.reduce(
    (sum: number, item: any) =>
      sum +
      toNumber(item?.quantity) *
        toNumber(item?.priceAtSale ?? item?.unitPrice ?? item?.price),
    0,
  );
};

const inferPaidAmount = (sale: any) => {
  const paid = toNumber(sale?.paidAmount ?? sale?.amountPaid);
  if (paid > 0) return paid;
  const paymentRows = Array.isArray(sale?.payments)
    ? sale.payments
    : Array.isArray(sale?.paymentTransactions)
      ? sale.paymentTransactions
      : [];
  const paymentsSum = paymentRows.reduce((sum: number, row: any) => sum + toNumber(row?.amount), 0);
  if (paymentsSum > 0) return paymentsSum;
  return String(sale?.paymentStatus || "").includes("PAID") ? inferSaleAmount(sale) : 0;
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
    status: normalizeVerificationStatus(tx?.status),
    screenshotUri: toImageUrl(tx?.proofUrl || tx?.screenshotUri),
    rejectionReason: tx?.rejectionReason,
  }));
};

const toDueSale = (sale: any): DueSale => {
  const totalAmount = Math.max(0, inferSaleAmount(sale));
  const paidAmount = Math.max(0, inferPaidAmount(sale));
  const dueAmount = Math.max(0, toNumber(sale?.dueAmount) || totalAmount - paidAmount);
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

  return {
    saleId: String(sale?._id || sale?.saleId || ""),
    customerId: customerId ? String(customerId) : undefined,
    customerName,
    customerPhone,
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
  saleId: String(item?.sale?._id || item?.saleId || item?.sale || ""),
  customerName:
    item?.customer?.name ||
    item?.sale?.customer?.name ||
    item?.customerName ||
    "Customer",
  customerPhone:
    item?.customer?.phone ||
    item?.customer?.phoneNumber ||
    item?.sale?.customer?.phone ||
    item?.customerPhone,
  amount: toNumber(item?.amount),
  mode: item?.mode || item?.paymentMode,
  utrNumber: item?.utrNumber || item?.utr || item?.upiUtr,
  paymentAt: item?.paymentAt || item?.paidAt || item?.transactionAt,
  screenshotUri: toImageUrl(item?.proofUrl || item?.screenshotUri),
  submittedAt: item?.submittedAt || item?.createdAt || new Date().toISOString(),
  status: normalizeVerificationStatus(item?.status),
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
      if (
        !user ||
        user.role === "NURSERY_ADMIN" ||
        user.role === "SUPER_ADMIN" ||
        user.role === "CUSTOMER"
      ) {
        // CUSTOMER rows are already scoped server-side using auth token.
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

    try {
      await api.post(apiPath(`/payments/${payload.id}/verify`), requestPayload);
    } finally {
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
    }
  },
};
