"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation"; // 1. Import useRouter
import { RefreshCw, FileText } from "lucide-react"; // Icons for UI consistency
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { patientAppointments } from "@/lib/services";
import { AppointmentItem } from "@/types";
import { useToast } from "@/context/ToastContext";
import { formatDateTimeIST } from "@/lib/datetime";
import { rememberDoctorName, resolveDoctorName } from "@/lib/identity";

function displayDoctorName(item: AppointmentItem) {
  const name = item.doctor_name || resolveDoctorName(String(item.doctor_id || ""));
  if (name) return name;
  if (item.doctor_email) return item.doctor_email;
  if (item.doctor_id) return item.doctor_id;
  return "Unknown Doctor";
}

function displayClinicName(item: AppointmentItem) {
  return item.clinic_name || item.clinic || item.clinic_id || "-";
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Cancelled":
    case "No-Show":
      return "bg-red-100 text-red-700 border-red-200";
    case "Completed":
      return "bg-green-100 text-green-700 border-green-200";
    case "In-Consultation":
    case "In Consultation":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "Waiting":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

export default function PatientMyAppointmentsPage() {
  const router = useRouter(); // 2. Initialize router
  const { pushToast } = useToast();
  const [items, setItems] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await patientAppointments();
      (res.appointments || []).forEach((item) => {
        if (item.doctor_id && item.doctor_name) {
          rememberDoctorName(String(item.doctor_id), String(item.doctor_name));
        }
      });
      setItems(res.appointments || []);
    } catch {
      pushToast("Failed to fetch appointments", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const status = String(item.status || "Scheduled");
      const matchesStatus = statusFilter === "All" || status === statusFilter;
      const matchesSearch = item.appointment_id?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [items, searchQuery, statusFilter]);

  const selectClassName = "flex h-10 w-full md:w-48 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]";

  return (
    <Card title="My Appointments" action={<Button loading={loading} onClick={load} className="flex gap-2 items-center"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</Button>}>
      
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
          <option value="In-Consultation">In Consultation</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
          <option value="No-Show">No-Show</option>
        </select>
      </div>

      <div className="overflow-x-auto border border-[var(--border)] rounded-md">
        <table className="table w-full text-left border-collapse">
          <thead className="bg-[var(--muted)]/10 border-b border-[var(--border)]">
            <tr>
              <th className="p-3 text-sm font-semibold">Appointment ID</th>
              <th className="p-3 text-sm font-semibold">Date</th>
              <th className="p-3 text-sm font-semibold">Doctor</th>
              <th className="p-3 text-sm font-semibold">Clinic</th>
              <th className="p-3 text-sm font-semibold">Reason</th>
              <th className="p-3 text-sm font-semibold">Status & Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 &&
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="border-b border-[var(--border)] last:border-0">
                  <td className="p-3"><Skeleton className="h-4 w-28" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-36" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="p-3"><Skeleton className="h-4 w-40" /></td>
                  <td className="p-3"><Skeleton className="h-6 w-28 rounded-full" /></td>
                </tr>
              ))}
            {filteredItems.map((item) => {
              const status = String(item.status || "Scheduled");
              
              return (
              <tr key={item.appointment_id} className="border-b border-[var(--border)] last:border-0 hover:bg-gray-50/50">
                <td className="p-3 text-sm font-mono">{item.appointment_id}</td>
                <td className="p-3 text-sm">{formatDateTimeIST(item.appointment_date)}</td>
                <td className="p-3 text-sm font-medium">{displayDoctorName(item)}</td>
                <td className="p-3 text-sm text-[var(--muted)]">{displayClinicName(item)}</td>
                <td className="p-3 text-sm">{item.reason}</td>
                <td className="p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`pill border ${getStatusColor(status)}`}>
                      {status}
                    </span>
                    
                    {/* 3. Care Plan Button Logic */}
                    {status === "Completed" && (
                      <button
                        onClick={() => router.push(`/patient/care-plan/${item.appointment_id}`)}
                        className="flex items-center gap-1 text-[10px] font-bold text-[var(--teal)] uppercase hover:underline cursor-pointer"
                        title="View Medical Care Plan"
                      >
                        <FileText className="w-3 h-3" />
                        Plan
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
            {!loading && !filteredItems.length && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-[var(--muted)]">
                  {items.length === 0
                    ? "You haven't booked any appointments yet."
                    : "No appointments match your search or filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
