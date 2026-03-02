"use client";

import Link from "next/link";
import Image from "next/image"; // 1. IMPORT NEXT/IMAGE
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link href={href} className={`side-link ${active ? "side-link-active" : ""}`}>
      {label}
    </Link>
  );
}

export default function Sidebar() {
  const { role, logout } = useAuth();
  const router = useRouter();

  return (
    <aside className="panel h-fit p-4 lg:sticky lg:top-4">
      
     
      <div className="flex items-center gap-2 mb-3">
        <Image 
          src="/logo.png" 
          alt="Dr. Decide Logo" 
          width={70}
          height={70} 
          className="object-contain" 
        />
        <p className="title text-xl font-bold tracking-tight">{role || "Guest"} portal</p>
      </div>
      

      {role === "Patient" && (
        <nav className="space-y-2">
          <NavItem href="/patient/dashboard" label="Dashboard" />
          <NavItem href="/patient/book-appointment" label="Book Appointment" />
          <NavItem href="/patient/my-appointments" label="My Appointments" />
          <NavItem href="/patient/care-plan" label="Care Plan" />
          <NavItem href="/patient/summarization" label="Summarization" />
          <NavItem href="/patient/notifications" label="Notifications" />
          <NavItem href="/patient/follow-ups" label="Follow Ups" />
          <NavItem href="/patient/account-settings" label="Account Settings" />
          <NavItem href="/patient/profile" label="Profile" />
        </nav>
      )}

      {role === "Doctor" && (
        <nav className="space-y-2">
          <NavItem href="/doctor/dashboard" label="Dashboard" />
          <NavItem href="/doctor/appointments" label="Appointments" />
          <NavItem href="/doctor/capacity" label="Capacity Settings" />
          <NavItem href="/doctor/patient-adherence" label="Patient Adherence" />
          <NavItem href="/doctor/patients" label="Patients Directory" />
          <NavItem href="/doctor/consultation" label="Consultation" />
          <NavItem href="/doctor/profile" label="Profile" />
        </nav>
      )}

      {role === "Receptionist" && (
        <nav className="space-y-2">
          <NavItem href="/receptionist/dashboard" label="Dashboard" />
          <NavItem href="/receptionist/manage-queue" label="Manage Queue" />
          <NavItem href="/receptionist/generate-token" label="Generate Token" />
        </nav>
      )}

      {/* USER INFO & LOGOUT */}
      <div className="mt-6 rounded-xl bg-[#f1f8fa] p-3 border border-[#dceff1]">
        <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Logged in as</p>
        <p className="title text-base mt-0.5">{role || "Guest"}</p>
      </div>

      <div className="mt-3 border-t border-[var(--border)] pt-3">
        <Button
          variant="secondary"
          className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
          onClick={() => {
            logout();
            router.push("/auth/login");
          }}
        >
          Logout
        </Button>
      </div>
    </aside>
  );
}