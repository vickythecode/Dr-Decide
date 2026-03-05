"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import { doctorAppointments, updateAppointmentStatus } from "@/lib/services";
import { DoctorAppointmentItem } from "@/types";
import { formatDateTimeIST, nowISTDateKey, toISTDateKey } from "@/lib/datetime";

export default function DoctorAppointmentsPage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DoctorAppointmentItem[]>([]);

  // Filter States for the "All Appointments" table
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Always strictly show TODAY's appointments here, regardless of filter state
  const todayRows = useMemo(() => {
    const todayIst = nowISTDateKey();
    return rows.filter((x) => toISTDateKey(x.appointment_date) === todayIst);
  }, [rows]);

  // Apply filters ONLY to the main "All Appointments" list
  const filteredAllRows = useMemo(() => {
    return rows.filter((row) => {
      const status = String(row.status || "Scheduled");
      const matchesStatus = statusFilter === "All" || status === statusFilter;
      const matchesSearch = row.appointment_id?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      
      return matchesStatus && matchesSearch;
    });
  }, [rows, searchQuery, statusFilter]);

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
        
        <button
          onClick={() => handleStatusUpdate(appointmentId, "No-Show")}
          className="rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 px-3 py-1.5 text-xs font-medium hover:bg-orange-100 transition-colors whitespace-nowrap cursor-pointer"
        >
          No-Show
        </button>
        
        <button
          onClick={() => handleStatusUpdate(appointmentId, "Cancelled")}
          className="rounded-2xl border border-red-200 bg-red-50 text-red-600 px-3 py-1.5 text-xs font-medium hover:bg-red-100 transition-colors whitespace-nowrap cursor-pointer"
        >
          Cancel
        </button>
      </div>
    );
  };

  const selectClassName = "flex h-10 w-full md:w-48 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]";

  return (
    <div className="space-y-4">
      {/* STATIC TOP CARD: Always shows today's agenda */}
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
              {loading && rows.length === 0 &&
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={`today-skeleton-${idx}`} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-36" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="p-3"><Skeleton className="h-6 w-24 rounded-full" /></td>
                    <td className="p-3"><Skeleton className="h-6 w-28" /></td>
                  </tr>
                ))}
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
              {!loading && !todayRows.length && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[var(--muted)]">No appointments scheduled for today.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* FILTERABLE BOTTOM CARD: All Historical & Future Appointments */}
      <Card title="All Appointments">
        
        {/* FILTER BAR */}
        <div className="mb-4 flex flex-col md:flex-row gap-3">
          <Input
            placeholder="Search by Appointment ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectClassName}
          >
            <option value="All">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Waiting">Waiting</option>
            <option value="In-Consultation">In-Consultation</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="No-Show">No-Show</option>
          </select>
        </div>

        <div className="overflow-x-auto border border-[var(--border)] rounded-md">
          <table className="table w-full text-left">
            <thead className="bg-[var(--muted)]/10 border-b border-[var(--border)]">
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
              {loading && rows.length === 0 &&
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={`all-skeleton-${idx}`} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-36" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="p-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="p-3"><Skeleton className="h-6 w-24 rounded-full" /></td>
                    <td className="p-3"><Skeleton className="h-6 w-28" /></td>
                  </tr>
                ))}
              {filteredAllRows.map((row, idx) => {
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
              {!loading && !filteredAllRows.length && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sm text-[var(--muted)]">
                    {rows.length === 0 
                      ? "No appointments found." 
                      : "No appointments match your search or filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
