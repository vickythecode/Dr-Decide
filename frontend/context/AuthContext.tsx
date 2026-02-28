"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { clearAuth, persistAuth, readRole, readToken } from "@/lib/auth";
import { Role } from "@/types";

type AuthContextValue = {
  token: string;
  role: Role | "";
  isAuthenticated: boolean;
  setSession: (token: string, role: Role) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string>(() => readToken());
  const [role, setRole] = useState<Role | "">(() => readRole());

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      role,
      isAuthenticated: !!token,
      setSession(nextToken, nextRole) {
        persistAuth(nextToken, nextRole);
        setToken(nextToken);
        setRole(nextRole);
      },
      logout() {
        clearAuth();
        setToken("");
        setRole("");
      },
    }),
    [role, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
