"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Role } from "@/types";
import { roleToDashboardPath } from "@/lib/roles";

function expectedRole(pathname: string): Role | "" {
  if (pathname.startsWith("/doctor")) return "Doctor";
  if (pathname.startsWith("/patient")) return "Patient";
  if (pathname.startsWith("/receptionist")) return "Receptionist";
  return "";
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const needed = expectedRole(pathname);
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
    if (needed && role && needed !== role) {
      router.replace(roleToDashboardPath(role));
    }
  }, [isAuthenticated, pathname, role, router]);

  return <>{children}</>;
}
