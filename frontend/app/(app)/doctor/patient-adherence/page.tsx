"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useToast } from "@/context/ToastContext";
import { doctorPatients } from "@/lib/services";
import { DoctorPatientsItem } from "@/types";

type AdherenceRow = {
  patient: string;
  latestAppointment: string;
  adherence: string;
  status: string;
};

export default function DoctorPatientAdherencePage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AdherenceRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await doctorPatients();
      const mapped = (res.patients || []).map((row: DoctorPatientsItem) => {
        const rawAdherence = row.adherence_percentage;
        return {
          patient: String(row.patient_id || ""),
          latestAppointment: String(row.latest_appointment_id || ""),
          adherence: typeof rawAdherence === "number" ? `${rawAdherence}%` : "N/A",
          status: String(row.status || "Unknown"),
        };
      });
      setRows(mapped);
    } catch {
      pushToast("Failed to load adherence data", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card title="Patient Adherence by Care Plan Task" action={<Button loading={loading} onClick={load}>Refresh</Button>}>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Latest Appointment</th>
              <th>Task Adherence</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.patient}-${row.latestAppointment}`}>
                <td>{row.patient}</td>
                <td>{row.latestAppointment}</td>
                <td>{row.adherence}</td>
                <td>{row.status}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="muted text-center">
                  No adherence data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
