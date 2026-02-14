export interface Customer {
  _id: string;
  name: string;
  mobileNumber?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerPayload {
  name: string;
  mobileNumber?: string;
  address?: string;
}
