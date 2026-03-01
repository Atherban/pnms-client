export const API_ENUMS = {
  role: ["SUPER_ADMIN", "NURSERY_ADMIN", "STAFF", "CUSTOMER"] as const,
  salePaymentMode: ["CASH", "UPI", "ONLINE"] as const,
  paymentMode: ["CASH", "UPI", "ONLINE", "BANK_TRANSFER"] as const,
  paymentVerificationAction: ["ACCEPT", "REJECT"] as const,
  paymentStatus: [
    "PENDING_VERIFICATION",
    "VERIFIED",
    "REJECTED",
    "CANCELLED",
  ] as const,
  salePaymentStatus: ["UNPAID", "PARTIALLY_PAID", "PAID", "OVERDUE"] as const,
  bannerScope: ["GLOBAL_SUPER_ADMIN", "NURSERY_ADMIN"] as const,
  reportType: [
    "SALES",
    "PAYMENT_DUES",
    "INVENTORY",
    "STAFF_ACCOUNTING",
    "EXPENSES",
    "PROFITABILITY",
  ] as const,
  reportFormat: ["PDF", "XLSX"] as const,
};

export type ApiRole = (typeof API_ENUMS.role)[number];
export type ApiSalePaymentMode = (typeof API_ENUMS.salePaymentMode)[number];
export type ApiPaymentMode = (typeof API_ENUMS.paymentMode)[number];
export type ApiPaymentVerificationAction =
  (typeof API_ENUMS.paymentVerificationAction)[number];
export type ApiPaymentStatus = (typeof API_ENUMS.paymentStatus)[number];
export type ApiSalePaymentStatus = (typeof API_ENUMS.salePaymentStatus)[number];
export type ApiBannerScope = (typeof API_ENUMS.bannerScope)[number];
export type ApiReportType = (typeof API_ENUMS.reportType)[number];
export type ApiReportFormat = (typeof API_ENUMS.reportFormat)[number];
