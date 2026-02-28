import { Role } from "@/types";

export type RoleSlug = "doctor" | "patient" | "receptionist";

export const ROLE_SLUG_MAP: Record<RoleSlug, Role> = {
  doctor: "Doctor",
  patient: "Patient",
  receptionist: "Receptionist",
};

export function roleToSlug(role: Role): RoleSlug {
  if (role === "Doctor") return "doctor";
  if (role === "Receptionist") return "receptionist";
  return "patient";
}

export function slugToRole(slug: string): Role | null {
  const normalized = slug.toLowerCase() as RoleSlug;
  return ROLE_SLUG_MAP[normalized] || null;
}

export function roleToDashboardPath(role: Role): string {
  if (role === "Doctor") return "/doctor/dashboard";
  if (role === "Receptionist") return "/receptionist/dashboard";
  return "/patient/dashboard";
}

