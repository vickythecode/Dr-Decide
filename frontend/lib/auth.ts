import { Role } from "@/types";

export const TOKEN_KEY = "dr_decide_token";
export const ROLE_KEY = "dr_decide_role";

export function readToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TOKEN_KEY) || "";
}

export function readRole(): Role | "" {
  if (typeof window === "undefined") return "";
  const role = window.localStorage.getItem(ROLE_KEY) as Role | null;
  return role || "";
}

export function persistAuth(token: string, role: Role) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(ROLE_KEY, role);
  document.cookie = `token=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
  document.cookie = `role=${encodeURIComponent(role)}; path=/; SameSite=Lax`;
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ROLE_KEY);
  document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = "role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}
