export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginApiResponse {
  message: string;
  data: {
    token: string;
    user: {
      _id: string;
      role: "ADMIN" | "STAFF" | "VIEWER";
      email: string;
      name: string;
      isActive: boolean;
    };
  };
}
