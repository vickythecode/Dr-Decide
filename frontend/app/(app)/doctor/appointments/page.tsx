"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useToast } from "@/context/ToastContext";
import { doctorAppointments, updateAppointmentStatus } from "@/lib/services";
import { DoctorAppointmentItem } from "@/types";
import { formatDateTimeIST, nowISTDateKey, toISTDateKey } from "@/lib/datetime";

export default function DoctorAppointmentsPage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DoctorAppointmentItem[]>([]);

  // Filter appointments for today
  const todayRows = useMemo(() => {
    const todayIst = nowISTDateKey();
    return rows.filter((x) => toISTDateKey(x.appointment_date) === todayIst);
  }, [rows]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await doctorAppointments();
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

  // --- UPGRADED: Generic Status Update Function ---
  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    if (!window.confirm(`Are you sure you want to mark this appointment as ${newStatus}?`)) return;
    
    setLoading(true);
    try {
      await updateAppointmentStatus(appointmentId, newStatus);
      pushToast(`Appointment marked as ${newStatus}`, "success");
      await load(); // Instantly refresh the table
    } catch (error) {
      pushToast(`Failed to update appointment`, "error");
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: Dynamic Color Helper for Status Pills ---
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
        // Default (Scheduled)
        return "bg-gray-100 text-gray-700 border-gray-200"; 
    }
  };

  // Helper function to render Action buttons based on status
  const renderActions = (row: DoctorAppointmentItem, patientId: string, patientName: string) => {
    const status = String(row.status || "Scheduled");
    const appointmentId = String(row.appointment_id || "");

    // Hide actions for all "Finished" states
    if (status === "Cancelled" || status === "Completed" || status === "No-Show") {
      return <span className="text-xs text-[var(--muted)] italic">No actions available</span>;
    }

    return (
      <div className="flex gap-2 items-center">
        <Link
          className="rounded-2xl bg-[#0f6963] text-white px-3 py-1.5 text-xs font-medium hover:bg-[#16a299] transition-colors whitespace-nowrap"
          href={`/doctor/consultation?appointment_id=${encodeURIComponent(appointmentId)}&patient_id=${encodeURIComponent(patientId)}&patient_name=${encodeURIComponent(patientName)}`}
        >
          Consult
        </Link>
        
        {/* Added No-Show Button */}
        <button
          onClick={() => handleStatusUpdate(appointmentId, "No-Show")}
          className="rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 px-3 py-1.5 text-xs font-medium hover:bg-orange-100 transition-colors whitespace-nowrap"
        >
          No-Show
        </button>
        
        <button
          onClick={() => handleStatusUpdate(appointmentId, "Cancelled")}
          className="rounded-2xl border border-red-200 bg-red-50 text-red-600 px-3 py-1.5 text-xs font-medium hover:bg-red-100 transition-colors whitespace-nowrap"
        >
          Cancel
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card title="Today Appointments" action={<Button loading={loading} onClick={load}>Refresh</Button>}>
        <div className="overflow-x-auto">
          <table className="table w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="p-3">Appointment</th>
                <th className="p-3">Date</th>
                <th className="p-3">Patient</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {todayRows.map((row, idx) => {
                const patientId = String(row.patient_id || "");
                const patientName = String(row.patient_name || "Unknown Patient"); 
                const status = String(row.status || "Scheduled");
                
                return (
                <tr key={`${idx}-${String(row.appointment_id || idx)}`} className="border-b border-[var(--border)] last:border-0">
                  <td className="p-3 text-sm">{String(row.appointment_id || "")}</td>
                  <td className="p-3 text-sm">{formatDateTimeIST(String(row.appointment_date || ""))}</td>
                  <td className="p-3 text-sm font-medium">{patientName}</td>
                  <td className="p-3 text-sm">{String(row.reason || "")}</td>
                  <td className="p-3 text-sm">
                    {/* FIXED: One clean, dynamically colored span! */}
                    <span className={`pill border ${getStatusColor(status)}`}>
                      {status}
                    </span>
                  </td>
                  <td className="p-3">
                    {renderActions(row, patientId, patientName)}
                  </td>
                </tr>
                );
              })}
              {!todayRows.length && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[var(--muted)]">No appointments scheduled for today.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="All Appointments">
        <div className="overflow-x-auto">
          <table className="table w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="p-3">Appointment</th>
                <th className="p-3">Date</th>
                <th className="p-3">Patient</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const patientId = String(row.patient_id || "");
                const patientName = String(row.patient_name || "Unknown Patient");
                const status = String(row.status || "Scheduled");

                return (
                <tr key={`${idx}-${String(row.appointment_id || idx)}`} className="border-b border-[var(--border)] last:border-0 hover:bg-gray-50/50">
                  <td className="p-3 text-sm">{String(row.appointment_id || "")}</td>
                  <td className="p-3 text-sm">{formatDateTimeIST(String(row.appointment_date || ""))}</td>
                  <td className="p-3 text-sm font-medium">{patientName}</td>
                  <td className="p-3 text-sm">{String(row.reason || "")}</td>
                  <td className="p-3 text-sm">
                    {/* FIXED: One clean, dynamically colored span! */}
                    <span className={`pill border ${getStatusColor(status)}`}>
                      {status}
                    </span>
                  </td>
                  <td className="p-3">
                    {renderActions(row, patientId, patientName)}
                  </td>
                </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[var(--muted)]">No appointments found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}