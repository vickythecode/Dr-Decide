"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useToast } from "@/context/ToastContext";
import { formatNameWithId } from "@/lib/display";
import { rememberPatientName, resolvePatientName } from "@/lib/identity";
import { doctorAppointments, doctorDashboardStats, doctorPatients } from "@/lib/services";
import { DoctorAppointmentItem, DoctorDashboardResponse, DoctorPatientsItem } from "@/types";
import { formatDateTimeIST, nowISTDateKey, toISTDateKey } from "@/lib/datetime";

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
      (patientsRes.patients || []).forEach((row) => {
        if (row.patient_id && row.patient_name) {
          rememberPatientName(String(row.patient_id), String(row.patient_name));
        }
      });
      (appointmentsRes.schedule || []).forEach((row) => {
        if (row.patient_id && row.patient_name) {
          rememberPatientName(String(row.patient_id), String(row.patient_name));
        }
      });
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

  function getResolvedPatientName(row: DoctorAppointmentItem) {
    const patientId = String(row.patient_id || "");
    return row.patient_name || row.patient_email || resolvePatientName(patientId);
  }

  return (
    <div className="space-y-4">
      <Card title="Doctor Dashboard">
        <p className="muted text-sm">
          Track appointments, manage day-level capacity, and review patient care-plan adherence.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card title="Total Patients"><p className="kpi-value">{totalPatients ?? "-"}</p></Card>
        <Card title="Today Appointments"><p className="kpi-value">{todayAppointmentsCount}</p></Card>
        <Card title="Current Daily Limit"><p className="kpi-value">{dailyLimit ?? "-"}</p></Card>
        <Card title="Care Plans"><p className="kpi-value">{stats?.metrics.care_plans_generated ?? "-"}</p></Card>
        <Card title="Critical Alerts"><p className="kpi-value">{stats?.metrics.critical_alerts ?? "-"}</p></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Upcoming Appointments (Top 5)" action={<Button loading={loading} onClick={load}>Refresh</Button>}>
          <div className="space-y-2">
            {todaysAppointments.map((row, idx) => (
              <div key={`${row.patient_id}-${idx}`} className="rounded-lg border border-[var(--border)] bg-[#f6fbfc] px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span>
                    {formatDateTimeIST(row.appointment_date)} - {formatNameWithId(getResolvedPatientName(row), String(row.patient_id || ""))} ({row.reason})
                  </span>
                  <Link
                    className="pill"
                    href={`/doctor/consultation?appointment_id=${encodeURIComponent(String(row.appointment_id || ""))}&patient_id=${encodeURIComponent(String(row.patient_id || ""))}&patient_name=${encodeURIComponent(String(getResolvedPatientName(row) || ""))}`}
                  >
                    Consult
                  </Link>
                </div>
              </div>
            ))}
            {!todaysAppointments.length && <p className="muted text-sm">No appointments for today.</p>}
          </div>
        </Card>

        <Card title="Total Appointments Today (Graph)">
          <div className="space-y-3">
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
          {Object.entries(statusCounts).map(([label, value]) => (
            <div key={label} className="rounded-lg border border-[var(--border)] p-3">
              <p className="text-xs text-[var(--muted)]">{label}</p>
              <p className="title mt-1 text-2xl">{value}</p>
            </div>
          ))}
          {!Object.keys(statusCounts).length && (
            <p className="muted text-sm">No patient adherence status available.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
