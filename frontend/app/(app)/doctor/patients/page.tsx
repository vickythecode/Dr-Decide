"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useToast } from "@/context/ToastContext";
import { doctorPatients } from "@/lib/services";
import { DoctorPatientsItem } from "@/types";

export default function DoctorPatientsPage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DoctorPatientsItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await doctorPatients();
      setRows(res.patients || []);
    } catch {
      pushToast("Failed to load patient directory", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card title="My Patients Directory" action={<Button loading={loading} onClick={load}>Refresh</Button>}>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Patient ID</th>
              <th>Latest Appointment</th>
              <th>Status</th>
              <th>Follow Up</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={`${idx}-${String(row.patient_id || idx)}`}>
                <td>{row.patient_id || ""}</td>
                <td>{row.latest_appointment_id || ""}</td>
                <td>{row.status || ""}</td>
                <td>{row.follow_up_reminder || ""}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="muted text-center">No patients found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
