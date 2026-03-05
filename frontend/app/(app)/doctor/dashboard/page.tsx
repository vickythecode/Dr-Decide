"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import { doctorAppointments, doctorDashboardStats, doctorPatients } from "@/lib/services";
import { DoctorAppointmentItem, DoctorDashboardResponse, DoctorPatientsItem } from "@/types";
import { formatDateTimeIST, nowISTDateKey, toISTDateKey } from "@/lib/datetime";

const getStatusColor = (status: string) => {
  switch (status) {
    case "Cancelled":
    case "No-Show":
      return "bg-red-100 text-red-700 border-red-200";
    case "Completed":
      return "bg-green-100 text-green-700 border-green-200";
    case "In-Consultation":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "Waiting":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200"; 
  }
};

export default function DoctorDashboardPage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DoctorDashboardResponse | null>(null);
  const [patients, setPatients] = useState<DoctorPatientsItem[]>([]);
  const [totalPatients, setTotalPatients] = useState<number | null>(null);
  const [appointmentRows, setAppointmentRows] = useState<DoctorAppointmentItem[]>([]);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardRes, patientsRes, appointmentsRes] = await Promise.all([
        doctorDashboardStats(),
        doctorPatients(),
        doctorAppointments(),
      ]);
      
      setStats(dashboardRes);
      setDailyLimit(dashboardRes.metrics.today_appointments_limit);
      setPatients(patientsRes.patients || []);
      setTotalPatients(patientsRes.total_patients ?? (patientsRes.patients || []).length);
      setAppointmentRows(appointmentsRes.schedule || []);
    } catch {
      pushToast("Failed to load dashboard stats", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const todayAppointmentsCount = useMemo(() => {
    const today = nowISTDateKey();
    return appointmentRows.filter((row) => toISTDateKey(row.appointment_date) === today).length;
  }, [appointmentRows]);

  const todaysAppointments = useMemo(() => {
    const today = nowISTDateKey();
    return appointmentRows
      .filter((row) => toISTDateKey(row.appointment_date) === today)
      .slice(0, 5);
  }, [appointmentRows]);

  const totalBookedByHour = useMemo(
    () => (stats?.hourly_capacity || []).reduce((sum, row) => sum + row.booked, 0),
    [stats]
  );

  const totalLimitByHour = useMemo(
    () => (stats?.hourly_capacity || []).reduce((sum, row) => sum + row.limit, 0),
    [stats]
  );

  const statusCounts = useMemo(() => {
    return patients.reduce<Record<string, number>>((acc, row) => {
      const key = String(row.status || "Unknown");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [patients]);

  function adjustDailyLimit(delta: number) {
    setDailyLimit((prev) => {
      const base = prev ?? stats?.metrics.today_appointments_limit ?? 1;
      return Math.max(1, Math.min(200, base + delta));
    });
  }

  return (
    <div className="space-y-4">
      <Card title="Doctor Dashboard">
        <p className="muted text-sm">
          Track appointments, manage day-level capacity, and review patient care-plan adherence.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card title="Total Patients">{loading && totalPatients === null ? <Skeleton className="h-8 w-16" /> : <p className="kpi-value">{totalPatients ?? "-"}</p>}</Card>
        <Card title="Today Appointments">{loading && !appointmentRows.length ? <Skeleton className="h-8 w-16" /> : <p className="kpi-value">{todayAppointmentsCount}</p>}</Card>
        <Card title="Current Daily Limit">{loading && dailyLimit === null ? <Skeleton className="h-8 w-16" /> : <p className="kpi-value">{dailyLimit ?? "-"}</p>}</Card>
        <Card title="Care Plans">{loading && !stats ? <Skeleton className="h-8 w-16" /> : <p className="kpi-value">{stats?.metrics.care_plans_generated ?? "-"}</p>}</Card>
        <Card title="Critical Alerts">{loading && !stats ? <Skeleton className="h-8 w-16" /> : <p className="kpi-value">{stats?.metrics.critical_alerts ?? "-"}</p>}</Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Upcoming Appointments (Top 5)" action={<Button loading={loading} onClick={load}>Refresh</Button>}>
          <div className="space-y-2">
            {loading && !todaysAppointments.length &&
              Array.from({ length: 5 }).map((_, idx) => <Skeleton key={`today-appt-skeleton-${idx}`} className="h-12 w-full rounded-lg" />)}
            {todaysAppointments.map((row, idx) => {
              const patientName = String(row.patient_name || "Unknown Patient");
              const status = String(row.status || "Scheduled");
              
              return (
              <div key={`${row.patient_id}-${idx}`} className="rounded-lg border border-[var(--border)] bg-[#f6fbfc] px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    {formatDateTimeIST(String(row.appointment_date))} - <span className="font-medium">{patientName}</span> ({String(row.reason)})
                    {/* FIXED: Gently inline status pill to prevent layout shifting */}
                    <span className={`ml-2 pill border px-2 py-0.5 text-[10px] ${getStatusColor(status)}`}>
                      {status}
                    </span>
                  </span>
                  
                  {/* Keep the tight Consult button styling */}
                  {status !== "Cancelled" && status !== "Completed" && status !== "No-Show" ? (
                    <Link
                      className="rounded-2xl bg-[#0f6963] text-white px-3 py-1.5 text-xs hover:bg-[#16a299] transition-colors whitespace-nowrap"
                      href={`/doctor/consultation?appointment_id=${encodeURIComponent(String(row.appointment_id || ""))}&patient_id=${encodeURIComponent(String(row.patient_id || ""))}&patient_name=${encodeURIComponent(patientName)}`}
                    >
                      Consult
                    </Link>
                  ) : (
                    <span className="text-xs text-[var(--muted)] italic whitespace-nowrap">No actions</span>
                  )}
                </div>
              </div>
              );
            })}
            
            {!loading && !todaysAppointments.length && <p className="muted text-sm">No appointments for today.</p>}

            {/* Subtle link at the bottom that blends perfectly */}
            {todaysAppointments.length > 0 && (
              <div className="pt-1">
                <Link href="/doctor/appointments" className="text-xs font-medium text-[var(--teal)] hover:underline">
                  View all appointments &rarr;
                </Link>
              </div>
            )}
          </div>
        </Card>

        <Card title="Total Appointments Today (Graph)">
          <div className="space-y-3">
            {loading && !stats ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : (
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>Booked</span>
                  <span>{totalBookedByHour}</span>
                </div>
                <div className="h-3 rounded-full bg-[#dceff1]">
                  <div
                    className="h-3 rounded-full bg-[var(--teal)]"
                    style={{
                      width: `${totalLimitByHour ? Math.min(100, (totalBookedByHour / totalLimitByHour) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}
            <p className="muted text-sm">Capacity today: {totalBookedByHour}/{dailyLimit ?? totalLimitByHour ?? 0}</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => adjustDailyLimit(-1)}>-</Button>
              <span className="pill">Adjust Appointment Limit By Day: {dailyLimit ?? "-"}</span>
              <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => adjustDailyLimit(1)}>+</Button>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Patient Adherence Overview">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {loading && !patients.length &&
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={`adherence-skeleton-${idx}`} className="rounded-lg border border-[var(--border)] p-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-7 w-10" />
              </div>
            ))}
          {Object.entries(statusCounts).map(([label, value]) => (
            <div key={label} className="rounded-lg border border-[var(--border)] p-3">
              <p className="text-xs text-[var(--muted)]">{label}</p>
              <p className="title mt-1 text-2xl">{value}</p>
            </div>
          ))}
          {!loading && !Object.keys(statusCounts).length && (
            <p className="muted text-sm">No patient adherence status available.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
