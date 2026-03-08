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
  const [showPassword, setShowPassword] = useState(false); // Toggle state added
  
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
                  className={`tab cursor-pointer ${role === item ? "tab-active" : ""}`}
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
        {/* Relative container added here for the eye button positioning */}
        <div className="relative">
          <Input 
            type={showPassword ? "text" : "password"} 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Enter password" 
            required 
            className="pr-10" // Optional: gives space for the icon so text doesn't overlap
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                <line x1="2" y1="2" x2="22" y2="22"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>

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