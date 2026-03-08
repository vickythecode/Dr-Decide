"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";

import { 
  LayoutDashboard, CalendarPlus, CalendarDays, ClipboardList, 
  FileText, Bell, Clock, Settings, User, CalendarCheck, 
  Sliders, Activity, Users, Stethoscope, ListOrdered, Ticket, LogOut 
} from "lucide-react";

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link href={href} className={`side-link ${active ? "side-link-active" : ""} block`}>
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="whitespace-nowrap">{label}</span>
      </div>
    </Link>
  );
}

export default function Sidebar() {
  const { role, logout } = useAuth();
  const router = useRouter();

  return (
    <aside className="panel h-fit p-4 lg:sticky lg:top-4">
      
      {/* YOUR EXACT LOGO HEADER */}
      <div className="flex items-center gap-2 mb-4">
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
          <NavItem href="/patient/dashboard" label="Dashboard" icon={LayoutDashboard} />
          <NavItem href="/patient/book-appointment" label="Book Appointment" icon={CalendarPlus} />
          <NavItem href="/patient/my-appointments" label="My Appointments" icon={CalendarDays} />
          <NavItem href="/patient/care-plan" label="Care Plan" icon={ClipboardList} />
          <NavItem href="/patient/summarization" label="Summarization" icon={FileText} />
          <NavItem href="/patient/notifications" label="Notifications" icon={Bell} />
          <NavItem href="/patient/follow-ups" label="Follow Ups" icon={Clock} />
          <NavItem href="/patient/account-settings" label="Account Settings" icon={Settings} />
          <NavItem href="/patient/profile" label="Profile" icon={User} />
        </nav>
      )}

      {role === "Doctor" && (
        <nav className="space-y-2">
          <NavItem href="/doctor/dashboard" label="Dashboard" icon={LayoutDashboard} />
          <NavItem href="/doctor/appointments" label="Appointments" icon={CalendarCheck} />
          
          <NavItem href="/doctor/adherence" label="Patient Adherence" icon={Activity} />
          <NavItem href="/doctor/patients" label="Patients Directory" icon={Users} />
          <NavItem href="/doctor/consultation" label="Consultation" icon={Stethoscope} />
          <NavItem href="/doctor/account-settings" label="Account Settings" icon={Settings} />
          <NavItem href="/doctor/profile" label="Profile" icon={User} />
        </nav>
      )}

      {role === "Receptionist" && (
        <nav className="space-y-2">
          <NavItem href="/receptionist/dashboard" label="Dashboard" icon={LayoutDashboard} />
          <NavItem href="/receptionist/manage-queue" label="Manage Queue" icon={ListOrdered} />
          <NavItem href="/receptionist/generate-token" label="Generate Token" icon={Ticket} />
        </nav>
      )}

      <div className="mt-8 rounded-xl bg-[#f1f8fa] p-3 border border-[#dceff1]">
        <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Logged in as</p>
        <p className="title text-base mt-0.5">{role || "Guest"}</p>
      </div>

      <div className="mt-4 border-t border-[var(--border)] pt-4">
        <Button
          variant="secondary"
          className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors flex items-center justify-center gap-2"
          onClick={() => {
            logout();
            router.push("/auth/login");
          }}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Logout
        </Button>
      </div>
    </aside>
  );
}