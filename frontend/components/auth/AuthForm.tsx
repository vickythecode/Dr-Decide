"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";
import { login, signup } from "@/lib/services";
import { useAuth } from "@/context/AuthContext";
import { Role } from "@/types";
import { roleToDashboardPath, roleToSlug } from "@/lib/roles";
import { api } from "@/lib/api";

type Mode = "login" | "signup";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = typeof window !== "undefined" ? window.atob(padded) : "";
    if (!json) return null;
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeRole(value: unknown): Role | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "doctor") return "Doctor";
  if (normalized === "patient") return "Patient";
  if (normalized === "receptionist") return "Receptionist";
  return null;
}

function resolveRoleFromToken(token: string): Role | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const directRole =
    normalizeRole(payload["custom:role"]) ||
    normalizeRole(payload.role) ||
    normalizeRole(payload["custom_role"]);
  if (directRole) return directRole;
  const groups = payload["cognito:groups"];
  if (Array.isArray(groups)) {
    for (const group of groups) {
      const role = normalizeRole(group);
      if (role) return role;
    }
  }
  return null;
}

async function roleToPostLoginPath(role: Role): Promise<string> {
  if (role === "Receptionist") return roleToDashboardPath(role);

  const profileEndpoint = role === "Doctor" ? "/api/doctor/profile" : "/api/patient/profile";
  const profilePath = role === "Doctor" ? "/doctor/profile" : "/patient/profile";
  const dashboardPath = roleToDashboardPath(role);

  try {
    const { data } = await api.get(profileEndpoint);
    const status = typeof data?.profile_status === "string" ? data.profile_status.toLowerCase() : "";
    if (status === "complete") return dashboardPath;
    return profilePath;
  } catch {
    // If profile check fails, avoid blocking access.
    return dashboardPath;
  }
}

export default function AuthForm({ mode, fixedRole }: { mode: Mode; fixedRole?: Role }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const { setSession } = useAuth();

  const [role, setRole] = useState<Role>(fixedRole || "Patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const roleOptions: Role[] =
    mode === "signup" ? (["Patient", "Doctor"] as Role[]) : (["Patient", "Doctor", "Receptionist"] as Role[]);

 async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        await signup({ email, password, role });
        
        // --- 1. CHANGE THE TOAST MESSAGE ---
        pushToast("Success! Please check your email for the code.", "success");
        
        // --- 2. UPDATE THE REDIRECT ROUTE ---
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}&role=${roleToSlug(role)}`);
        
      } else {
        const res = await login({ email, password });
        const token = res.id_token || res.access_token;
        if (!token) {
          pushToast("Login failed. Please try again.", "error");
          return;
        }

        const authenticatedRole = resolveRoleFromToken(token);
        if (!authenticatedRole) {
          pushToast("Login failed. Please try again.", "error");
          return;
        }

        if (fixedRole && authenticatedRole !== fixedRole) {
          pushToast(`This account belongs to ${authenticatedRole}. Please use the ${authenticatedRole} login portal.`, "error");
          return;
        }

        setSession(token, authenticatedRole);
        pushToast("Login successful", "success");
        const nextPath = await roleToPostLoginPath(authenticatedRole);
        router.push(nextPath);
      }
    } catch {
      if (mode === "login") {
        pushToast("Login failed. Please check your credentials and try again.", "error");
      } else {
        pushToast("Sign up failed. Please try again.", "error");
      }
    } finally {
      setLoading(false);
    }
  }
  return (
    <Card title={`Dr. Decide ${mode === "login" ? "Login" : "Sign Up"}`}>
      <p className="muted mb-4 text-sm">
        {fixedRole ? `${fixedRole} portal access` : "Role-based portal access"}.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        {!fixedRole && (
          <>
            <label className="text-sm font-semibold">Role</label>
            <div className="flex gap-2">
              {roleOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`tab ${role === item ? "tab-active" : ""}`}
                  onClick={() => {
                    setRole(item);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </>
        )}

        <label className="text-sm font-semibold">Email</label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required />

        <label className="text-sm font-semibold">Password</label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required />

        <Button loading={loading} className="w-full" type="submit">
          {mode === "login" ? "Login" : "Create Account"}
        </Button>
      </form>

      <div className="mt-4 text-sm text-[var(--muted)]">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link className="text-[var(--teal)]" href={fixedRole ? `/auth/signup/${roleToSlug(role)}` : "/auth/signup"}>
              Create account
            </Link>
          </>
        ) : (
          <>
            Already have account?{" "}
            <Link className="text-[var(--teal)]" href={fixedRole ? `/auth/login/${roleToSlug(role)}` : "/auth/login"}>
              Login
            </Link>
          </>
        )}
      </div>
    </Card>
  );
}
