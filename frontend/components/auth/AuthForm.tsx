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

type Mode = "login" | "signup";

export default function AuthForm({ mode, fixedRole }: { mode: Mode; fixedRole?: Role }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const { setSession } = useAuth();

  const [role, setRole] = useState<Role>(fixedRole || "Patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        await signup({ email, password, role });
        pushToast("Account created. Please login.", "success");
        router.push(fixedRole ? `/auth/login/${roleToSlug(role)}` : "/auth/login");
      } else {
        const res = await login({ email, password });
        const token = res.id_token || res.access_token;
        if (!token) {
          pushToast("No token returned from backend", "error");
          return;
        }
        setSession(token, role);
        pushToast("Login successful", "success");
        router.push(roleToDashboardPath(role));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      pushToast(message, "error");
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
              {(["Patient", "Doctor", "Receptionist"] as Role[]).map((item) => (
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
