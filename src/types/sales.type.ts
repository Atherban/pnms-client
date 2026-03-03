export interface SaleItem {
  _id?: string;
  inventoryId?: string;
  inventory?: {
    _id: string;
    plantType?: { _id: string; name: string };
  };
  quantity: number;
  priceAtSale?: number;
  unitPrice?: number;
  price?: number;
  costAtSale?: number;
  profit?: number;
  batchDeductions?: {
    inventoryId?: string;
    batchId?: string;
    quantity: number;
    unitCost?: number;
  }[];
}

export interface Sale {
  _id: string;
  saleNumber?: string;
  saleKind?: "PRODUCT" | "SERVICE" | "SERVICE_SALE" | string;
  serviceInvoice?: {
    sowingCharge?: number;
    germinationCharge?: number;
    labourCharge?: number;
    soilCharge?: number;
    trayCharge?: number;
    maintenanceCharge?: number;
    otherCharge?: number;
    notes?: string;
  };
  nurseryId?:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
        code?: string;
        settings?: {
          contactDetails?: {
            label?: string;
            phoneNumber?: string;
            whatsappNumber?: string;
            email?: string;
            address?: string;
          }[];
          socialLinks?: {
            website?: string;
            whatsapp?: string;
          };
          paymentConfig?: {
            upiId?: string;
          };
        };
      };
  items: SaleItem[];
  totalAmount: number;
  grossAmount?: number;
  discountAmount?: number;
  netAmount?: number;
  paidAmount?: number;
  dueAmount?: number;
  paymentStatus?:
    | "PAID"
    | "PARTIALLY_PAID"
    | "UNPAID"
    | "PENDING_VERIFICATION"
    | string;
  totalCost?: number;
  totalProfit?: number;
  grossMarginPercent?: number;
  paymentMode: string;
  payments?: {
    _id?: string;
    amount?: number;
    mode?: string;
    status?: string;
    utrNumber?: string;
    transactionRef?: string;
    createdAt?: string;
    verifiedAt?: string;
  }[];
  performedBy?:
    | string
    | {
        _id: string;
        name?: string;
        email?: string;
        role?: "NURSERY_ADMIN" | "STAFF" | "CUSTOMER" | "SUPER_ADMIN";
      };
  customer?: {
    _id: string;
    name?: string;
    phone?: string;
  };
  status?: "COMPLETED" | "PENDING" | "CANCELLED" | string;
  saleDate?: string;
  notes?: string;
  roleAtTime: "NURSERY_ADMIN" | "STAFF";
  returns?: {
    _id?: string;
    status?: "REQUESTED" | "APPROVED" | "REJECTED" | "COMPLETED" | string;
    quantity: number;
    refundAmount?: number;
    reason?: string;
    createdAt?: string;
    approvedAt?: string;
    completedAt?: string;
  }[];
  createdAt: string;
  updatedAt?: string;
}
