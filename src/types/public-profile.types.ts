export interface NurseryPaymentConfig {
  upiId?: string;
  beneficiaryName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  paymentNotes?: string;
  qrImageUrl?: string;
}

export interface NurseryPublicContact {
  id: string;
  label?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  email?: string;
  address?: string;
  imageUrl?: string;
  qrImageUrl?: string;
}

export interface NurseryPublicProfile {
  nurseryId: string;
  name?: string;
  code?: string;
  paymentConfig?: NurseryPaymentConfig;
  contactDetails?: NurseryPublicContact[];
  logoImageUrl?: string;
  phoneNumber?: string;
  upiId?: string;
  qrImageUrl?: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  whatsappPhone?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  notes?: string;
  updatedAt: string;
  updatedBy?: string;
}
