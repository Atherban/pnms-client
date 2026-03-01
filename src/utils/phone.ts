export const normalizeIndianPhone = (input?: string) => {
  const raw = (input || "").replace(/[^\d+]/g, "").trim();
  if (!raw) return "";

  const digits = raw.replace(/\D/g, "");

  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (raw.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return "";
};

export const isValidIndianUserPhone = (input?: string) => {
  const digits = (input || "").replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) return true;
  if (/^91[6-9]\d{9}$/.test(digits)) return true;
  return /^\+91[6-9]\d{9}$/.test(input || "");
};
