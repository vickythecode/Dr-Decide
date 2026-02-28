import { notFound } from "next/navigation";
import AuthForm from "@/components/auth/AuthForm";
import { slugToRole } from "@/lib/roles";

export default async function RoleLoginPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role: roleSlug } = await params;
  const role = slugToRole(roleSlug);
  if (!role) {
    notFound();
  }

  return <AuthForm mode="login" fixedRole={role} />;
}

