import { jwtDecode } from "jwt-decode";

export interface DecodedToken {
  userId: string;
  role: "ADMIN" | "STAFF" | "VIEWER";
  exp: number;
}

export const decodeToken = (token: string): DecodedToken => jwtDecode(token);

export const isTokenExpired = (token: string) => {
  const decoded = decodeToken(token);
  return Date.now() >= decoded.exp * 1000;
};
