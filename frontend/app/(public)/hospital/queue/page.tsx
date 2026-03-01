"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { hospitalQueue } from "@/lib/services";
import { useToast } from "@/context/ToastContext";
import { firstPresent, formatNameWithId } from "@/lib/display";
import { resolvePatientName } from "@/lib/identity";

export default function HospitalQueuePage() {
  const { pushToast } = useToast();
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hospitalQueue();
      setRows(res.current_queue || []);
    } catch {
      pushToast("Failed to load queue status", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <Card title="Waiting Room Queue Status" action={<span className="pill">{loading ? "Refreshing..." : "Auto refresh 10s"}</span>}>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Patient ID</th>
              <th>Appointment ID</th>
              <th>Token</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td>
                  {formatNameWithId(
                    firstPresent(row, ["patient_name", "patient_full_name", "full_name", "name"]) ||
                      resolvePatientName(String(row.patient_id || "")),
                    row.patient_id,
                    ""
                  )}
                </td>
                <td>{String(row.appointment_id || "")}</td>
                <td>{String(row.token_number || "")}</td>
                <td>{String(row.status || "")}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="muted text-center">No patients in queue.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
