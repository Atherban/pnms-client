export interface ExpenseUserRef {
  _id: string;
  name?: string;
  role?: string;
  email?: string;
  phoneNumber?: string;
}

export interface Expense {
  _id: string;
  type: string;
  description?: string;
  purpose?: string;
  productDetails?: string;
  purchasedBy?: string | ExpenseUserRef;
  amount: number;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpensePayload {
  type: string;
  description?: string;
  purpose?: string;
  productDetails?: string;
  amount: number;
  date?: string;
}
