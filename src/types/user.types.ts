export interface User {
  _id: string;
  name: string;
  email: string;
  role: "NURSERY_ADMIN" | "STAFF" | "CUSTOMER" | "SUPER_ADMIN";
  isActive: boolean;
}
