export interface ApiError {
  code: string | number;
  status?: number;
  message: string;
  details?: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
