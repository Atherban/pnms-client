export interface LoginPayload {
  email?: string;
  phoneNumber?: string;
  password: string;
}

export interface LoginApiResponse {
  message: string;
  data: {
    token: string;
    user: {
      _id: string;
      role: "NURSERY_ADMIN" | "STAFF" | "CUSTOMER" | "SUPER_ADMIN";
      email?: string;
      name: string;
      phoneNumber?: string;
      nurseryId?: string;
      allowedNurseryIds?: string[];
      isActive: boolean;
    };
  };
}
