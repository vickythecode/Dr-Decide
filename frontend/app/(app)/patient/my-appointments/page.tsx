"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { patientAppointments } from "@/lib/services";
import { AppointmentItem } from "@/types";
import { useToast } from "@/context/ToastContext";
import { formatDateTimeIST } from "@/lib/datetime";

function displayDoctorName(item: AppointmentItem) {
  if (item.doctor_name) return item.doctor_name;
  if (item.doctor_email) return item.doctor_email;
  if (item.doctor_id) return item.doctor_id;
  return "-";
}

function displayClinicName(item: AppointmentItem) {
  return item.clinic_name || item.clinic || item.clinic_id || "-";
}

export default function PatientMyAppointmentsPage() {
  const { pushToast } = useToast();
  const [items, setItems] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await patientAppointments();
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
        <table className="table">
          <thead>
            <tr>
              <th>Appointment ID</th>
              <th>Date</th>
              <th>Doctor</th>
              <th>Clinic</th>
              <th>Reason</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.appointment_id}>
                <td>{item.appointment_id}</td>
                <td>{formatDateTimeIST(item.appointment_date)}</td>
                <td>{displayDoctorName(item)}</td>
                <td>{displayClinicName(item)}</td>
                <td>{item.reason}</td>
                <td>{item.status}</td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={6} className="muted text-center">No appointments found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
