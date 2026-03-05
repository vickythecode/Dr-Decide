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

// --- JWT HELPERS ---
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

// --- CORE REDIRECT & PROFILE SYNC LOGIC ---
async function roleToPostLoginPath(role: Role): Promise<string> {
  if (role === "Receptionist") return roleToDashboardPath(role);

  const profileEndpoint = role === "Doctor" ? "/api/doctor/profile" : "/api/patient/profile";
  const profilePath = role === "Doctor" ? "/doctor/profile" : "/patient/profile";
  const dashboardPath = roleToDashboardPath(role);

  try {
    // We fetch the profile to check completion status AND sync the name
    const { data } = await api.get(profileEndpoint);
    
    // --- SYNC NAME TO LOCALSTORAGE ---
    if (typeof window !== "undefined" && data) {
      if (role === "Patient" && data.full_name) {
        // This key matches what your booking page looks for
        window.localStorage.setItem("patient_profile_fullName", data.full_name);
        if (data.pincode) {
            window.localStorage.setItem("patient_profile_pincode", data.pincode);
        }
      } else if (role === "Doctor" && data.doctor_name) {
        window.localStorage.setItem("doctor_profile_name", data.doctor_name);
      }
    }

    const status = typeof data?.profile_status === "string" ? data.profile_status.toLowerCase() : "";
    if (status === "complete") return dashboardPath;
    return profilePath;
  } catch {
    // Avoid blocking access if the profile API is down
    return dashboardPath;
  }
}

// --- MAIN AUTH FORM COMPONENT ---
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
        pushToast("Success! Please check your email for the code.", "success");
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
          pushToast("Login failed. Role not found.", "error");
          return;
        }

        if (fixedRole && authenticatedRole !== fixedRole) {
          pushToast(`This account belongs to ${authenticatedRole}. Please use the correct portal.`, "error");
          return;
        }

        // Establish session in AuthContext
        setSession(token, authenticatedRole);
        pushToast("Login successful", "success");
        
        // Sync name and determine destination
        const nextPath = await roleToPostLoginPath(authenticatedRole);
        router.push(nextPath);
      }
    } catch (err) {
      pushToast("Authentication failed. Please check your credentials.", "error");
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
                  onClick={() => setRole(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </>
        )}

        <label className="text-sm font-semibold">Email</label>
        <Input 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="name@example.com" 
          required 
        />

        <label className="text-sm font-semibold">Password</label>
        <Input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          placeholder="Enter password" 
          required 
        />

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