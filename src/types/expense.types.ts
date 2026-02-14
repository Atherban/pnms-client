export interface Expense {
  _id: string;
  type: string;
  description?: string;
  amount: number;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpensePayload {
  type: string;
  description?: string;
  amount: number;
  date?: string;
}
