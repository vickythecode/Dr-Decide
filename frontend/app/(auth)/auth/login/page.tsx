import Link from "next/link";
import Card from "@/components/ui/Card";
import { Role } from "@/types";

export default function LoginPage() {
  const roles: Array<{ role: Role; slug: string; desc: string }> = [
    { role: "Patient", slug: "patient", desc: "Book appointments and track your care plan." },
    { role: "Doctor", slug: "doctor", desc: "Manage appointments, capacity, and adherence." },
    { role: "Receptionist", slug: "receptionist", desc: "Handle queue and generate walk-in tokens." },
  ];

  return (
    <Card title="Sign In To Your Portal">
      <p className="muted mb-4 text-sm">Select your role to continue to secure login.</p>
      <div className="space-y-3">
        {roles.map((item) => (
          <Link
            key={item.slug}
            href={`/auth/login/${item.slug}`}
            className="auth-role-card"
          >
            <p className="title text-base">{item.role} Login</p>
            <p className="muted mt-1 text-sm">{item.desc}</p>
          </Link>
        ))}
      </div>
      <p className="muted mt-4 text-sm">
        Need an account? <Link className="text-[var(--teal)]" href="/auth/signup">Sign up</Link>
      </p>
    </Card>
  );
}
