export type NotificationAudience =
  | "CUSTOMER"
  | "NURSERY_ADMIN"
  | "STAFF"
  | "SUPER_ADMIN"
  | "ALL";

export type ProductStatusTag =
  | "SOWN"
  | "GERMINATED"
  | "READY"
  | "DISCARDED"
  | "PAYMENT_PENDING"
  | "PAYMENT_VERIFIED"
  | "PAYMENT_REJECTED";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  audience: NotificationAudience;
  createdAt: string;
  isRead: boolean;
  nurseryId?: string;
  createdBy?: string;
  customerId?: string;
  customerPhone?: string;
  productStatusTag?: ProductStatusTag;
}
