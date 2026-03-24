import type { NurseryPublicProfile } from "../types/public-profile.types";
import type { Sale } from "../types/sales.type";
import { toImageUrl } from "./image";

export interface BillLineItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface BillPaymentRow {
  id: string;
  amount: number;
  mode: string;
  status: string;
  reference?: string;
  paidAt?: string;
}

export interface BillNurseryInfo {
  name: string;
  code?: string;
  logoImageUrl?: string;
  logoBase64?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  email?: string;
  address?: string;
  website?: string;
  upiId?: string;
}

export interface BillData {
  billNumber: string;
  saleId: string;
  saleNumber: string;
  issuedAt: string;
  dueDate?: string;
  currencyCode: string;
  customerName: string;
  customerPhone?: string;
  paymentMode: string;
  paymentStatus: string;
  sellerName: string;
  nursery: BillNurseryInfo;
  items: BillLineItem[];
  payments: BillPaymentRow[];
  totalUnits: number;
  subtotal: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  netAmount: number;
  paidAmount: number;
  dueAmount: number;
  grandTotal: number;
  totalAmount: number;
}



const getSaleTimestamp = (sale: Partial<Sale>): Date => {
  const source = sale.saleDate || sale.createdAt || new Date().toISOString();
  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) return new Date();
  return parsed;
};

const toFixedNumber = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
};

const pad2 = (value: number): string => String(value).padStart(2, "0");

const toCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const logoDataUriCache = new Map<string, string>();

const inferImageMimeType = (value?: string): string => {
  const normalized = String(value || "").toLowerCase();
  if (normalized.startsWith("data:image/png")) return "image/png";
  if (normalized.startsWith("data:image/webp")) return "image/webp";
  if (normalized.startsWith("data:image/gif")) return "image/gif";
  if (normalized.startsWith("data:image/svg+xml")) return "image/svg+xml";
  if (normalized.startsWith("data:image/jpeg") || normalized.startsWith("data:image/jpg")) {
    return "image/jpeg";
  }

  const withoutQuery = normalized.split("?")[0].split("#")[0];
  if (withoutQuery.endsWith(".png")) return "image/png";
  if (withoutQuery.endsWith(".webp")) return "image/webp";
  if (withoutQuery.endsWith(".gif")) return "image/gif";
  if (withoutQuery.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
};

export const convertImageUrlToDataUri = async (
  imageUrl?: string | null,
): Promise<string | undefined> => {
  const resolvedUrl = toImageUrl(imageUrl);
  if (!resolvedUrl) return undefined;
  if (resolvedUrl.startsWith("data:image/")) return resolvedUrl;

  const cached = logoDataUriCache.get(resolvedUrl);
  if (cached) return cached;

  try {
    const fsPackage = "expo-file-system/legacy";
    const FileSystem = await import(fsPackage);
    const fileExtension = inferImageMimeType(resolvedUrl).split("/")[1] || "img";
    const tempFileUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}bill-logo-${Date.now()}.${fileExtension}`;

    await FileSystem.downloadAsync(resolvedUrl, tempFileUri);
    const base64 = await FileSystem.readAsStringAsync(tempFileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    FileSystem.deleteAsync(tempFileUri, { idempotent: true }).catch(() => undefined);

    if (!base64) return undefined;
    const dataUri = `data:${inferImageMimeType(resolvedUrl)};base64,${base64}`;
    logoDataUriCache.set(resolvedUrl, dataUri);
    return dataUri;
  } catch {
    return undefined;
  }
};

export const buildBillNumber = (sale: Partial<Sale>): string => {
  const ts = getSaleTimestamp(sale);
  const saleCode = String(sale.saleNumber || sale._id || "SALE")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-8)
    .toUpperCase();
  const stamp = `${ts.getFullYear()}${pad2(ts.getMonth() + 1)}${pad2(ts.getDate())}`;
  return `INV-${stamp}-${saleCode || "SALE"}`;
};

export const getSellerName = (sale: Partial<Sale>): string => {
  if (typeof sale.performedBy === "string" && sale.performedBy.trim()) {
    return sale.performedBy.trim();
  }
  if (sale.performedBy && typeof sale.performedBy === "object") {
    return sale.performedBy.name || sale.performedBy.email || "Staff";
  }
  return "Staff";
};

const getSaleCustomerName = (sale: Partial<Sale>): string => {
  const customerObj = sale.customer;
  if (customerObj?.name && customerObj.name.trim()) return customerObj.name.trim();
  const fallback = (sale as any)?.customerName;
  if (typeof fallback === "string" && fallback.trim()) return fallback.trim();
  return "Walk-in Customer";
};

const getSaleCustomerPhone = (sale: Partial<Sale>): string | undefined => {
  return sale.customer?.phone || (sale as any)?.customerPhone || undefined;
};

const resolveNurseryInfo = (
  sale: Partial<Sale>,
  nurseryProfile?: NurseryPublicProfile | null,
): BillNurseryInfo => {
  const saleNursery =
    sale?.nurseryId && typeof sale.nurseryId === "object" ? sale.nurseryId : null;
  const saleBranding =
    ((saleNursery?.settings as any)?.branding as Record<string, any> | undefined) ||
    ((saleNursery as any)?.branding as Record<string, any> | undefined) ||
    {};
  const contact = nurseryProfile?.contactDetails?.[0];
  const settingsContact = saleNursery?.settings?.contactDetails?.[0];
  const social = saleNursery?.settings?.socialLinks;
  const paymentConfig = saleNursery?.settings?.paymentConfig;

  return {
    name:
      nurseryProfile?.name ||
      saleNursery?.name ||
      contact?.label ||
      nurseryProfile?.contactDetails?.[0]?.label ||
      "Nursery",
    code: saleNursery?.code,
    logoImageUrl:
      toImageUrl(nurseryProfile?.logoImageUrl) ||
      toImageUrl(
        saleBranding?.logoImageUrl ||
          saleBranding?.logoImage ||
          saleBranding?.logoUrl ||
          (saleNursery as any)?.logoImageUrl ||
          (saleNursery as any)?.logoUrl,
      ),
    phoneNumber:
      contact?.phoneNumber ||
      settingsContact?.phoneNumber ||
      nurseryProfile?.primaryPhone ||
      nurseryProfile?.secondaryPhone ||
      undefined,
    whatsappNumber:
      contact?.whatsappNumber ||
      settingsContact?.whatsappNumber ||
      nurseryProfile?.whatsappPhone ||
      social?.whatsapp ||
      undefined,
    email: contact?.email || settingsContact?.email || undefined,
    address: contact?.address || settingsContact?.address || undefined,
    website: nurseryProfile?.website || social?.website || undefined,
    upiId: nurseryProfile?.paymentConfig?.upiId || paymentConfig?.upiId || nurseryProfile?.upiId,
  };
};

const toPaymentRows = (sale: Partial<Sale>): BillPaymentRow[] => {
  const rows = Array.isArray((sale as any)?.payments) ? (sale as any).payments : [];
  return rows.map((payment: any, index: number) => ({
    id: String(payment?._id || `payment-${index + 1}`),
    amount: Math.max(0, toFixedNumber(payment?.amount)),
    mode: String(payment?.mode || sale.paymentMode || "UNKNOWN").toUpperCase(),
    status: String(
      payment?.status ||
        (payment?.verifiedAt || payment?.verifiedBy ? "VERIFIED" : "PENDING_VERIFICATION"),
    ).toUpperCase(),
    reference: payment?.transactionRef || payment?.utrNumber || undefined,
    paidAt: payment?.verifiedAt || payment?.createdAt,
  }));
};

export const buildBillDataFromSale = (
  sale: Partial<Sale>,
  options?: { nurseryProfile?: NurseryPublicProfile | null },
): BillData => {
  const mappedItems = Array.isArray(sale.items)
    ? sale.items.map((item, index) => {
        const inventoryRef =
          typeof item.inventoryId === "string"
            ? item.inventoryId
            : item.inventory?._id || `line-${index + 1}`;
        const plant = item.inventory?.plantType;
        const name =
          item.plantTypeName ||
          item.inventoryLabel ||
          plant?.name ||
          `Item ${index + 1}`;
        const category =
          item.plantCategory ||
          (plant as any)?.category ||
          "General";
        const quantity = Math.max(0, toFixedNumber(item.quantity));
        const unitPrice = Math.max(
          0,
          toFixedNumber(item.priceAtSale ?? item.unitPrice ?? item.price),
        );
        return {
          id: inventoryRef,
          name,
          category,
          quantity,
          unitPrice,
          lineTotal: quantity * unitPrice,
        };
      })
    : [];
  const saleKind = String((sale as any)?.saleKind || "").toUpperCase();
  const customerSeedBatch =
    (sale as any)?.customerSeedBatch && typeof (sale as any).customerSeedBatch === "object"
      ? (sale as any).customerSeedBatch
      : null;
  const serviceUnits = Math.max(
    0,
    toFixedNumber(
      customerSeedBatch?.germinatedQuantity ??
        customerSeedBatch?.seedsGerminated ??
        customerSeedBatch?.seedsSown,
    ),
  );
  const serviceName =
    customerSeedBatch?.plantTypeId?.name ||
    (sale as any)?.serviceInvoice?.plantTypeName ||
    "Seedling Service";
  const serviceItems =
    mappedItems.length === 0 && saleKind === "SERVICE_SALE"
      ? (() => {
          const quantity = serviceUnits > 0 ? serviceUnits : 1;
          const lineTotal = Math.max(0, toFixedNumber(sale.netAmount ?? sale.totalAmount));
          const unitPrice = quantity > 0 ? lineTotal / quantity : lineTotal;
          return [
            {
              id: String(customerSeedBatch?._id || sale._id || "service-line"),
              name: `${serviceName}`,
              category: "Service Invoice",
              quantity,
              unitPrice,
              lineTotal,
            },
          ];
        })()
      : [];
  const items = mappedItems.length > 0 ? mappedItems : serviceItems;

  const totalUnits = items.reduce((sum, line) => sum + line.quantity, 0);
  const linesSubtotal = items.reduce((sum, line) => sum + line.lineTotal, 0);
  const subtotalRaw =
    toFixedNumber(sale.grossAmount) ||
    toFixedNumber(sale.totalAmount) ||
    linesSubtotal;
  const discountAmount = Math.max(0, toFixedNumber(sale.discountAmount));
  const netAmountRaw = toFixedNumber(sale.netAmount);
  const netAmount =
    netAmountRaw > 0
      ? netAmountRaw
      : Math.max(0, subtotalRaw - discountAmount);

  const paidAmountRaw = toFixedNumber(sale.paidAmount);
  const dueAmountRaw = toFixedNumber(sale.dueAmount);
  const dueAmount = Math.max(0, dueAmountRaw || netAmount - paidAmountRaw);
  const paidAmount = Math.max(0, paidAmountRaw || netAmount - dueAmount);

  const taxPercent = 0;
  const taxAmount = 0;
  const grandTotal = Math.max(0, netAmount + taxAmount);
  const totalAmount = grandTotal;

  const ts = getSaleTimestamp(sale);
  const dueDate = dueAmount > 0 ? new Date(ts.getTime() + 7 * 24 * 60 * 60 * 1000) : undefined;
  const customerName = getSaleCustomerName(sale);
  const customerPhone = getSaleCustomerPhone(sale);
  const paymentMode = String(sale.paymentMode || "UNKNOWN").toUpperCase();
  const billNumber = buildBillNumber(sale);
  const paymentStatus = String(
    sale.paymentStatus || (dueAmount > 0 ? "PARTIALLY_PAID" : "PAID"),
  ).toUpperCase();
  const payments = toPaymentRows(sale);

  return {
    billNumber,
    saleId: String(sale._id || "N/A"),
    saleNumber: String(sale.saleNumber || sale._id || "N/A"),
    issuedAt: ts.toISOString(),
    dueDate: dueDate?.toISOString(),
    currencyCode: "INR",
    customerName,
    customerPhone,
    paymentMode,
    paymentStatus,
    sellerName: getSellerName(sale),
    nursery: resolveNurseryInfo(sale, options?.nurseryProfile),
    items,
    payments,
    totalUnits,
    subtotal: Math.max(0, subtotalRaw),
    discountAmount,
    taxPercent,
    taxAmount,
    netAmount,
    paidAmount,
    dueAmount,
    grandTotal,
    totalAmount,
  };
};

export const buildBillDataFromSaleAsync = async (
  sale: Partial<Sale>,
  options?: { nurseryProfile?: NurseryPublicProfile | null },
): Promise<BillData> => {
  const bill = buildBillDataFromSale(sale, options);
  const logoBase64 = await convertImageUrlToDataUri(bill.nursery.logoImageUrl);

  return {
    ...bill,
    nursery: {
      ...bill.nursery,
      logoBase64,
    },
  };
};

export const formatBillShareText = (bill: BillData): string => {
  const itemLines = bill.items
    .map(
      (line, index) =>
        `${index + 1}. ${line.name} - Qty ${line.quantity} x ${toCurrency(line.unitPrice)} = ${toCurrency(line.lineTotal)}`,
    )
    .join("\n");

  const paymentLines = bill.payments.length
    ? bill.payments
        .map(
          (p, idx) =>
            `${idx + 1}. ${toCurrency(p.amount)} via ${p.mode} (${p.status})${p.reference ? ` • Ref ${p.reference}` : ""}`,
        )
        .join("\n")
    : "- No payment entries -";

  const lines = [
    `${bill.nursery.name} - Tax Invoice`,
    `Invoice No: ${bill.billNumber}`,
    `Sale Ref: ${bill.saleNumber}`,
    `Date: ${new Date(bill.issuedAt).toLocaleString("en-IN")}`,
    ...(bill.dueDate ? [`Due Date: ${new Date(bill.dueDate).toLocaleDateString("en-IN")}`] : []),
    `Customer: ${bill.customerName}`,
    `Phone: ${bill.customerPhone || "N/A"}`,
    `Payment Mode: ${bill.paymentMode}`,
    `Payment Status: ${bill.paymentStatus}`,
    `Handled By: ${bill.sellerName}`,
    ...(bill.nursery.phoneNumber ? [`Nursery Phone: ${bill.nursery.phoneNumber}`] : []),
    ...(bill.nursery.address ? [`Address: ${bill.nursery.address}`] : []),
    "",
    "Items:",
    itemLines || "- No line items -",
    "",
    "Payments:",
    paymentLines,
    "",
    `Total Units: ${bill.totalUnits}`,
    `Subtotal: ${toCurrency(bill.subtotal)}`,
    `Discount: ${toCurrency(bill.discountAmount)}`,
    `Net Amount: ${toCurrency(bill.netAmount)}`,
    `Paid Amount: ${toCurrency(bill.paidAmount)}`,
    `Due Amount: ${toCurrency(bill.dueAmount)}`,
    `Grand Total: ${toCurrency(bill.grandTotal)}`,
  ];

  return lines.join("\n");
};

export const formatBillHtml = (bill: BillData): string => {
  const itemRows = bill.items
    .map(
      (line, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${line.name}</td>
        <td>${line.category}</td>
        <td class="right">${line.quantity}</td>
        <td class="right">${toCurrency(line.unitPrice)}</td>
        <td class="right">${toCurrency(line.lineTotal)}</td>
      </tr>`,
    )
    .join("");

  const paymentRows = bill.payments
    .map(
      (payment, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${toCurrency(payment.amount)}</td>
        <td>${payment.mode}</td>
        <td>${payment.status}</td>
        <td>${payment.reference || "-"}</td>
      </tr>`,
    )
    .join("");
    

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; margin: 0; padding: 24px; }
        .top { display: flex; justify-content: space-between; border-bottom: 2px solid #1f2937; padding-bottom: 12px; margin-bottom: 16px; }
        .brand { display: flex; align-items: flex-start; gap: 14px; }
        .brand-logo { width: 72px; height: 72px; object-fit: contain; border-radius: 12px; background: #f3f4f6; }
        .brand-logo-placeholder { width: 72px; height: 72px; border-radius: 12px; background: #f3f4f6; border: 1px solid #d1d5db; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; }
        .company { font-size: 24px; font-weight: 800; letter-spacing: 0.4px; }
        .company-sub { font-size: 12px; color: #4b5563; margin-top: 4px; }
        .invoice-title { font-size: 22px; font-weight: 700; text-align: right; }
        .invoice-meta { font-size: 12px; color: #374151; line-height: 1.5; text-align: right; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
        .box { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
        .box-title { font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 6px; letter-spacing: 0.6px; }
        .box-line { font-size: 13px; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; }
        th { background: #f3f4f6; text-align: left; text-transform: uppercase; font-size: 11px; letter-spacing: 0.4px; }
        .right { text-align: right; }
        .totals-wrap { margin-top: 12px; margin-left: auto; width: 360px; border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
        .totals-row { display: flex; justify-content: space-between; font-size: 13px; margin: 5px 0; }
        .grand { border-top: 1px solid #d1d5db; margin-top: 8px; padding-top: 8px; font-size: 16px; font-weight: 700; }
        .section-title { margin-top: 20px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.4px; color: #374151; }
        .footer { margin-top: 24px; font-size: 11px; color: #6b7280; display: flex; justify-content: space-between; }
      </style>
    </head>
    <body>
      <div class="top">
        <div class="brand">
          ${
            bill.nursery.logoBase64 || bill.nursery.logoImageUrl
              ? `<img src="${bill.nursery.logoBase64 || bill.nursery.logoImageUrl}" class="brand-logo" alt="${bill.nursery.name} logo" />`
              : `<div class="brand-logo-placeholder">Logo</div>`
          }
          <div>
            <div class="company">${bill.nursery.name}</div>
            ${bill.nursery.code ? `<div class="company-sub">Code: ${bill.nursery.code}</div>` : ""}
            ${bill.nursery.address ? `<div class="company-sub">${bill.nursery.address}</div>` : ""}
            ${bill.nursery.phoneNumber ? `<div class="company-sub">Phone: ${bill.nursery.phoneNumber}</div>` : ""}
            ${bill.nursery.email ? `<div class="company-sub">Email: ${bill.nursery.email}</div>` : ""}
            ${bill.nursery.website ? `<div class="company-sub">Website: ${bill.nursery.website}</div>` : ""}
          </div>
        </div>
        <div>
          <div class="invoice-title">TAX INVOICE</div>
          <div class="invoice-meta">
            Invoice No: ${bill.billNumber}<br/>
            Sale Ref: ${bill.saleNumber}<br/>
            Issue Date: ${new Date(bill.issuedAt).toLocaleDateString("en-IN")}<br/>
            ${bill.dueDate ? `Due Date: ${new Date(bill.dueDate).toLocaleDateString("en-IN")}<br/>` : ""}
            Payment Status: ${bill.paymentStatus}
          </div>
        </div>
      </div>

      <div class="grid">
        <div class="box">
          <div class="box-title">Bill To</div>
          <div class="box-line"><strong>${bill.customerName}</strong></div>
          <div class="box-line">Phone: ${bill.customerPhone || "N/A"}</div>
        </div>
        <div class="box">
          <div class="box-title">Bill Details</div>
          <div class="box-line">Sale ID: ${bill.saleId}</div>
          <div class="box-line">Payment Mode: ${bill.paymentMode}</div>
          <div class="box-line">Handled By: ${bill.sellerName}</div>
          ${bill.nursery.upiId ? `<div class="box-line">UPI ID: ${bill.nursery.upiId}</div>` : ""}
        </div>
      </div>

      <div class="section-title">Line Items</div>
      <table>
        <thead>
          <tr>
            <th style="width:7%">#</th>
            <th style="width:43%">Item Description</th>
            <th style="width:15%">Category</th>
            <th class="right" style="width:10%">Qty</th>
            <th class="right" style="width:12%">Rate</th>
            <th class="right" style="width:13%">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows || '<tr><td colspan="6">No line items</td></tr>'}
        </tbody>
      </table>

      <div class="section-title">Payments</div>
      <table>
        <thead>
          <tr>
            <th style="width:8%">#</th>
            <th style="width:22%">Amount</th>
            <th style="width:20%">Mode</th>
            <th style="width:20%">Status</th>
            <th style="width:30%">Reference</th>
          </tr>
        </thead>
        <tbody>
          ${paymentRows || '<tr><td colspan="5">No payments recorded</td></tr>'}
        </tbody>
      </table>

      <div class="totals-wrap">
        <div class="totals-row"><span>Total Units</span><span>${bill.totalUnits}</span></div>
        <div class="totals-row"><span>Subtotal</span><span>${toCurrency(bill.subtotal)}</span></div>
        <div class="totals-row"><span>Discount</span><span>${toCurrency(bill.discountAmount)}</span></div>
        <div class="totals-row"><span>Net Amount</span><span>${toCurrency(bill.netAmount)}</span></div>
        <div class="totals-row"><span>Paid Amount</span><span>${toCurrency(bill.paidAmount)}</span></div>
        <div class="totals-row"><span>Due Amount</span><span>${toCurrency(bill.dueAmount)}</span></div>
        <div class="totals-row grand"><span>Grand Total</span><span>${toCurrency(bill.grandTotal)}</span></div>
      </div>

      <div class="footer">
        <div>System Generated Invoice - ${bill.billNumber}</div>
        <div>Authorized Signatory</div>
      </div>
    </body>
  </html>`;
};
