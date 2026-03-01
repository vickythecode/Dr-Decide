import { notFound } from "next/navigation";
import AuthForm from "@/components/auth/AuthForm";
import { slugToRole } from "@/lib/roles";

export default async function RoleSignupPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role: roleSlug } = await params;
  const role = slugToRole(roleSlug);
  if (!role || role === "Receptionist") {
    notFound();
  }

  return <AuthForm mode="signup" fixedRole={role} />;
}
