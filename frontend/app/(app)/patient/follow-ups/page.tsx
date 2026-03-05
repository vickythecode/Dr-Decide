"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import { patientAppointments } from "@/lib/services";
import { AppointmentItem } from "@/types";
import { formatDateTimeIST } from "@/lib/datetime";

export default function PatientFollowUpsPage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AppointmentItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await patientAppointments();
      const sorted = [...(res.appointments || [])].sort((a, b) =>
        a.appointment_date.localeCompare(b.appointment_date)
      );
      setRows(sorted);
    } catch {
      pushToast("Failed to load follow-ups", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card title="Follow Ups" action={<Button loading={loading} onClick={load}>Refresh</Button>}>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Appointment ID</th>
              <th>Purpose</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && !rows.length &&
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={`followup-skeleton-${idx}`}>
                  <td><Skeleton className="h-4 w-36" /></td>
                  <td><Skeleton className="h-4 w-28" /></td>
                  <td><Skeleton className="h-4 w-40" /></td>
                  <td><Skeleton className="h-4 w-24" /></td>
                </tr>
              ))}
            {rows.map((item) => (
              <tr key={item.appointment_id}>
                <td>{formatDateTimeIST(item.appointment_date)}</td>
                <td>{item.appointment_id}</td>
                <td>{item.reason}</td>
                <td>{item.status}</td>
              </tr>
            ))}
            {!loading && !rows.length && (
              <tr>
                <td colSpan={4} className="muted text-center">No follow-up records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
