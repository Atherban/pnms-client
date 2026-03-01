export type PaymentVerificationStatus =
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "REJECTED"
  | "CANCELLED"
  | "PENDING"
  | "APPROVED"
  | "SYNC_QUEUED";

export interface PaymentTransaction {
  id: string;
  amount: number;
  mode?: string;
  createdAt: string;
  reference?: string;
  utrNumber?: string;
  paymentAt?: string;
  status: PaymentVerificationStatus;
  screenshotUri?: string;
  rejectionReason?: string;
}

export interface DueSale {
  saleId: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  issuedAt: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: "PAID" | "PARTIAL" | "DUE";
  transactions: PaymentTransaction[];
}

export interface PaymentProof {
  id: string;
  saleId: string;
  customerName: string;
  customerPhone?: string;
  amount: number;
  mode?: string;
  utrNumber?: string;
  paymentAt?: string;
  screenshotUri?: string;
  submittedAt: string;
  status: PaymentVerificationStatus;
  reviewerName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  reference?: string;
}
