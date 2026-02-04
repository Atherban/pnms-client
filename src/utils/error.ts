export const normalizeError = (error: any) => {
  return {
    message: error?.response?.data?.error?.message || "Something went wrong",
    code: error?.response?.status || "UNKNOWN",
  };
};
