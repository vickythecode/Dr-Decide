"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { patientAppointments } from "@/lib/services";
import { AppointmentItem } from "@/types";
import { useToast } from "@/context/ToastContext";
import { formatDateTimeIST } from "@/lib/datetime";
import { rememberDoctorName, resolveDoctorName } from "@/lib/identity";

// 1. SIMPLIFIED: Just return the name! No more IDs.
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

// 2. ADDED: Consistent color coding for statuses to match the Doctor side!
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

export default function PatientMyAppointmentsPage() {
  const { pushToast } = useToast();
  const [items, setItems] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <Card title="My Appointments" action={<Button loading={loading} onClick={load}>Refresh</Button>}>
      <div className="overflow-x-auto">
        {/* MATCHED STYLING: Made the table match the clean UI of the doctor dashboard */}
        <table className="table w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="p-3">Appointment ID</th>
              <th className="p-3">Date</th>
              <th className="p-3">Doctor</th>
              <th className="p-3">Clinic</th>
              <th className="p-3">Reason</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const status = String(item.status || "Scheduled");
              
              return (
              <tr key={item.appointment_id} className="border-b border-[var(--border)] last:border-0 hover:bg-gray-50/50">
                <td className="p-3 text-sm">{item.appointment_id}</td>
                <td className="p-3 text-sm">{formatDateTimeIST(item.appointment_date)}</td>
                <td className="p-3 text-sm font-medium">{displayDoctorName(item)}</td>
                <td className="p-3 text-sm text-[var(--muted)]">{displayClinicName(item)}</td>
                <td className="p-3 text-sm">{item.reason}</td>
                <td className="p-3 text-sm">
                  {/* Applied the color-coded pill */}
                  <span className={`pill border ${getStatusColor(status)}`}>
                    {status}
                  </span>
                </td>
              </tr>
              );
            })}
            {!items.length && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[var(--muted)]">No appointments found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}