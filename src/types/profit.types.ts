export interface ProfitResponse {
  totalSales: number;
  totalExpenses: number;
  profit: number;
}

export interface ProfitRequest {
  startDate: string;
  endDate: string;
}
