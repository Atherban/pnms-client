import type { Sale } from "../types/sales.type";

export interface BillLineItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface BillData {
  billNumber: string;
  saleId: string;
  issuedAt: string;
  dueDate: string;
  currencyCode: string;
  customerName: string;
  customerPhone?: string;
  paymentMode: string;
  sellerName: string;
  items: BillLineItem[];
  totalUnits: number;
  subtotal: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
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

export const buildBillNumber = (sale: Partial<Sale>): string => {
  const ts = getSaleTimestamp(sale);
  const saleId = String(sale._id || "SALE").slice(-6).toUpperCase();
  const stamp = `${ts.getFullYear()}${pad2(ts.getMonth() + 1)}${pad2(ts.getDate())}`;
  return `BILL-${stamp}-${saleId}`;
};

export const getSellerName = (sale: Partial<Sale>): string => {
  if (typeof sale.performedBy === "string" && sale.performedBy.trim()) {
    return sale.performedBy.trim();
  }
  if (sale.performedBy && typeof sale.performedBy === "object") {
    return sale.performedBy.name || sale.performedBy.email || "Unknown Staff";
  }
  return "Unknown Staff";
};

export const buildBillDataFromSale = (sale: Partial<Sale>): BillData => {
  const items = Array.isArray(sale.items)
    ? sale.items.map((item, index) => {
        const inventoryRef =
          typeof item.inventoryId === "string"
            ? item.inventoryId
            : item.inventory?._id || `line-${index + 1}`;
        const plant = item.inventory?.plantType;
        const name = plant?.name || `Item ${index + 1}`;
        const category = (plant as any)?.category || "General";
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

  const totalUnits = items.reduce((sum, line) => sum + line.quantity, 0);
  const fallbackTotal = items.reduce((sum, line) => sum + line.lineTotal, 0);
  const subtotal = Math.max(0, toFixedNumber(sale.totalAmount || fallbackTotal));
  const discountAmount = 0;
  const taxPercent = 0;
  const taxableBase = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.max(0, (taxableBase * taxPercent) / 100);
  const grandTotal = Math.max(0, taxableBase + taxAmount);
  const totalAmount = grandTotal;
  const ts = getSaleTimestamp(sale);
  const dueDate = new Date(ts.getTime() + 7 * 24 * 60 * 60 * 1000);
  const customerName = sale.customer?.name?.trim() || "Walk-in Customer";
  const paymentMode = (sale.paymentMode || "UNKNOWN").toUpperCase();
  const billNumber = buildBillNumber(sale);

  return {
    billNumber,
    saleId: sale._id || "N/A",
    issuedAt: ts.toISOString(),
    dueDate: dueDate.toISOString(),
    currencyCode: "INR",
    customerName,
    customerPhone: sale.customer?.phone,
    paymentMode,
    sellerName: getSellerName(sale),
    items,
    totalUnits,
    subtotal,
    discountAmount,
    taxPercent,
    taxAmount,
    grandTotal,
    totalAmount,
  };
};

export const formatBillShareText = (bill: BillData): string => {
  const itemLines = bill.items
    .map(
      (line, index) =>
        `${index + 1}. ${line.name} - Qty ${line.quantity} x ₹${line.unitPrice} = ₹${line.lineTotal}`,
    )
    .join("\n");

  const lines = [
    "PNMS - Customer Bill",
    `Bill No: ${bill.billNumber}`,
    `Date: ${new Date(bill.issuedAt).toLocaleString("en-IN")}`,
    `Customer: ${bill.customerName}`,
    `Payment: ${bill.paymentMode}`,
    `Handled By: ${bill.sellerName}`,
    "",
    "Items:",
    itemLines || "- No line items -",
    "",
    `Total Units: ${bill.totalUnits}`,
    `Subtotal: ₹${bill.subtotal}`,
    `Discount: ₹${bill.discountAmount}`,
    `Tax (${bill.taxPercent}%): ₹${bill.taxAmount}`,
    `Grand Total: ₹${bill.grandTotal}`,
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
        <td class="right">₹${line.unitPrice.toFixed(2)}</td>
        <td class="right">₹${line.lineTotal.toFixed(2)}</td>
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
        .totals-wrap { margin-top: 12px; margin-left: auto; width: 320px; border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
        .totals-row { display: flex; justify-content: space-between; font-size: 13px; margin: 5px 0; }
        .grand { border-top: 1px solid #d1d5db; margin-top: 8px; padding-top: 8px; font-size: 16px; font-weight: 700; }
        .footer { margin-top: 24px; font-size: 11px; color: #6b7280; display: flex; justify-content: space-between; }
        .signature { text-align: right; }
      </style>
    </head>
    <body>
      <div class="top">
        <div>
          <div class="company">PNMS</div>
          <div class="company-sub">Plant Nursery Management System</div>
          <div class="company-sub">Nursery Operations & Sales Billing</div>
        </div>
        <div>
          <div class="invoice-title">TAX INVOICE</div>
          <div class="invoice-meta">
            Invoice No: ${bill.billNumber}<br/>
            Issue Date: ${new Date(bill.issuedAt).toLocaleDateString("en-IN")}<br/>
            Due Date: ${new Date(bill.dueDate).toLocaleDateString("en-IN")}
          </div>
        </div>
      </div>

      <div class="grid">
        <div class="box">
          <div class="box-title">Bill To</div>
          <div class="box-line"><strong>${bill.customerName}</strong></div>
          ${bill.customerPhone ? `<div class="box-line">Phone: ${bill.customerPhone}</div>` : `<div class="box-line">Phone: N/A</div>`}
        </div>
        <div class="box">
          <div class="box-title">Bill Details</div>
          <div class="box-line">Sale Ref: ${bill.saleId}</div>
          <div class="box-line">Payment Mode: ${bill.paymentMode}</div>
          <div class="box-line">Handled By: ${bill.sellerName}</div>
        </div>
      </div>

      <div>
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
      </div>

      <div class="totals-wrap">
        <div class="totals-row"><span>Total Units</span><span>${bill.totalUnits}</span></div>
        <div class="totals-row"><span>Subtotal</span><span>₹${bill.subtotal.toFixed(2)}</span></div>
        <div class="totals-row"><span>Discount</span><span>₹${bill.discountAmount.toFixed(2)}</span></div>
        <div class="totals-row"><span>Tax (${bill.taxPercent.toFixed(2)}%)</span><span>₹${bill.taxAmount.toFixed(2)}</span></div>
        <div class="totals-row grand"><span>Grand Total</span><span>₹${bill.grandTotal.toFixed(2)}</span></div>
      </div>

      <div class="footer">
        <div>System Generated Invoice - ${bill.billNumber}</div>
        <div class="signature">Authorized Signatory</div>
      </div>
    </body>
  </html>`;
};
