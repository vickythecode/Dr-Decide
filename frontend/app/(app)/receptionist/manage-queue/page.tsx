"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useToast } from "@/context/ToastContext";
import { firstPresent, formatNameWithId } from "@/lib/display";
import { resolvePatientName } from "@/lib/identity";
import { hospitalQueue } from "@/lib/services";

export default function ReceptionistManageQueuePage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [queue, setQueue] = useState<Array<Record<string, unknown>>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hospitalQueue();
      setQueue(res.current_queue || []);
    } catch {
      pushToast("Failed to load queue status", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <Card title="Manage Queue" action={<Button loading={loading} onClick={load}>Refresh</Button>}>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Token</th>
              <th>Patient ID</th>
              <th>Appointment ID</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((row, idx) => (
              <tr key={`${String(row.token_number || idx)}-${idx}`}>
                <td>{String(row.token_number || "-")}</td>
                <td>
                  {formatNameWithId(
                    firstPresent(row, ["patient_name", "patient_full_name", "full_name", "name"]) ||
                      resolvePatientName(String(row.patient_id || "")),
                    row.patient_id,
                    "-"
                  )}
                </td>
                <td>{String(row.appointment_id || "-")}</td>
                <td>{String(row.status || "-")}</td>
              </tr>
            ))}
            {!queue.length && (
              <tr>
                <td colSpan={4} className="muted text-center">
                  Queue is currently empty.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
