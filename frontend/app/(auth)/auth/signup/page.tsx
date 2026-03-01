import Link from "next/link";
import Card from "@/components/ui/Card";
import { Role } from "@/types";

export default function SignupPage() {
  const roles: Array<{ role: Role; slug: string; desc: string }> = [
    { role: "Patient", slug: "patient", desc: "Create patient account for appointments and follow-ups." },
    { role: "Doctor", slug: "doctor", desc: "Create doctor account for consultation workflows." },
  ];

  return (
    <Card title="Create Account">
      <p className="muted mb-4 text-sm">Choose role-based registration to get started quickly.</p>
      <div className="space-y-3">
        {roles.map((item) => (
          <Link
            key={item.slug}
            href={`/auth/signup/${item.slug}`}
            className="auth-role-card"
          >
            <p className="title text-base">{item.role} Sign Up</p>
            <p className="muted mt-1 text-sm">{item.desc}</p>
          </Link>
        ))}
      </div>
      <p className="muted mt-4 text-sm">
        Already registered? <Link className="text-[var(--teal)]" href="/auth/login">Sign in</Link>
      </p>
    </Card>
  );
}
