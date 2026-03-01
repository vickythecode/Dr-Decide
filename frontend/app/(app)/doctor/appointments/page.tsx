"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useToast } from "@/context/ToastContext";
import { formatNameWithId } from "@/lib/display";
import { rememberPatientName, resolvePatientName } from "@/lib/identity";
import { doctorAppointments } from "@/lib/services";
import { DoctorAppointmentItem } from "@/types";
import { formatDateTimeIST, nowISTDateKey, toISTDateKey } from "@/lib/datetime";

export default function DoctorAppointmentsPage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DoctorAppointmentItem[]>([]);

  const todayRows = useMemo(() => {
    const todayIst = nowISTDateKey();
    return rows.filter((x) => toISTDateKey(x.appointment_date) === todayIst);
  }, [rows]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await doctorAppointments();
      (res.schedule || []).forEach((row) => {
        if (row.patient_id && row.patient_name) {
          rememberPatientName(String(row.patient_id), String(row.patient_name));
        }
      });
      setRows(res.schedule || []);
    } catch {
      pushToast("Failed to fetch doctor appointments", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  function getResolvedPatientName(row: DoctorAppointmentItem) {
    const patientId = String(row.patient_id || "");
    return row.patient_name || row.patient_email || resolvePatientName(patientId);
  }

  return (
    <div className="space-y-4">
      <Card title="Today Appointments" action={<Button loading={loading} onClick={load}>Refresh</Button>}>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Appointment</th>
                <th>Date</th>
                <th>Patient</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {todayRows.map((row, idx) => {
                const patientId = String(row.patient_id || "");
                const resolvedPatientName = getResolvedPatientName(row);
                return (
                <tr key={`${idx}-${String(row.appointment_id || idx)}`}>
                  <td>{String(row.appointment_id || "")}</td>
                  <td>{formatDateTimeIST(String(row.appointment_date || ""))}</td>
                  <td>{formatNameWithId(resolvedPatientName, "")}</td>
                  <td>{String(row.reason || "")}</td>
                  <td>{String(row.status || "")}</td>
                  <td>
                    <Link
                      className="pill"
                      href={`/doctor/consultation?appointment_id=${encodeURIComponent(String(row.appointment_id || ""))}&patient_id=${encodeURIComponent(patientId)}&patient_name=${encodeURIComponent(String(resolvedPatientName || ""))}`}
                    >
                      Open Consultation
                    </Link>
                  </td>
                </tr>
                );
              })}
              {!todayRows.length && (
                <tr>
                  <td colSpan={6} className="muted text-center">No appointments scheduled for today.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="All Appointments">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Appointment</th>
                <th>Date</th>
                <th>Patient</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const patientId = String(row.patient_id || "");
                const resolvedPatientName = getResolvedPatientName(row);
                return (
                <tr key={`${idx}-${String(row.appointment_id || idx)}`}>
                  <td>{String(row.appointment_id || "")}</td>
                  <td>{formatDateTimeIST(String(row.appointment_date || ""))}</td>
                  <td>{formatNameWithId(resolvedPatientName, "")}</td>
                  <td>{String(row.reason || "")}</td>
                  <td>{String(row.status || "")}</td>
                  <td className="">
                    <Link
                      className="rounded-2xl bg-[#0f6963] text-white px-2.5 py-1 hover:bg-[#16a299]"
                      href={`/doctor/consultation?appointment_id=${encodeURIComponent(String(row.appointment_id || ""))}&patient_id=${encodeURIComponent(patientId)}&patient_name=${encodeURIComponent(String(resolvedPatientName || ""))}`}
                    >
                      Open Consultation
                    </Link>
                  </td>
                </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="muted text-center">No appointments found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
