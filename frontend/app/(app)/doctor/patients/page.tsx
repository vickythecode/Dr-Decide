"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import { formatNameWithId } from "@/lib/display";
import { resolvePatientName } from "@/lib/identity";
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
              <th>Patient</th>
              <th>Latest Appointment</th>
              <th>Status</th>
              <th>Follow Up</th>
            </tr>
          </thead>
          <tbody>
            {loading && !rows.length &&
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={`patients-skeleton-${idx}`}>
                  <td><Skeleton className="h-4 w-40" /></td>
                  <td><Skeleton className="h-4 w-28" /></td>
                  <td><Skeleton className="h-4 w-20" /></td>
                  <td><Skeleton className="h-4 w-36" /></td>
                </tr>
              ))}
            {rows.map((row, idx) => (
              <tr key={`${idx}-${String(row.patient_id || idx)}`}>
                <td>{formatNameWithId(row.patient_name || resolvePatientName(String(row.patient_id || "")), row.patient_id, "")}</td>
                <td>{row.latest_appointment_id || ""}</td>
                <td>{row.status || ""}</td>
                <td>{row.follow_up_reminder || ""}</td>
              </tr>
            ))}
            {!loading && !rows.length && (
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
