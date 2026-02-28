"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { hospitalCheckIn, hospitalQueue } from "@/lib/services";

export default function ReceptionistDashboardPage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [queue, setQueue] = useState<Array<Record<string, unknown>>>([]);
  const [patientId, setPatientId] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [generatedToken, setGeneratedToken] = useState<Record<string, unknown> | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hospitalQueue();
      setQueue(res.current_queue || []);
    } catch {
      pushToast("Failed to load queue", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  async function generateToken() {
    setLoading(true);
    try {
      const res = await hospitalCheckIn({ patient_id: patientId, appointment_id: appointmentId });
      setGeneratedToken(res as Record<string, unknown>);
      pushToast("Token generated", "success");
      await loadQueue();
    } catch {
      pushToast("Failed to generate token", "error");
    } finally {
      setLoading(false);
    }
  }

  const openTasks = useMemo(() => queue.filter((item) => String(item.status || "").toLowerCase() !== "completed").length, [queue]);
  const notificationCount = useMemo(
    () =>
      queue.filter((item) => ["pending", "waiting", "delayed"].includes(String(item.status || "").toLowerCase())).length,
    [queue]
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Today Bookings"><p className="kpi-value">{queue.length}</p></Card>
        <Card title="Patient Check-Ins"><p className="kpi-value">{queue.length}</p></Card>
        <Card title="Open Tasks"><p className="kpi-value">{openTasks}</p></Card>
        <Card title="Notifications"><p className="kpi-value">{notificationCount}</p></Card>
      </div>

      <Card
        title="Front Desk Queue"
        action={
          <Link className="pill" href="/receptionist/manage-queue">
            View All
          </Link>
        }
      >
        <div className="space-y-2">
          {queue.slice(0, 4).map((row, idx) => (
            <div key={idx} className="rounded-lg border border-[var(--border)] bg-[#f6fbfc] px-3 py-2 text-sm">
              Token {String(row.token_number || "-")} - Appointment {String(row.appointment_id || "-")} ({String(row.status || "-")})
            </div>
          ))}
          {!queue.length && <p className="muted text-sm">No active queue entries.</p>}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Token Generation Desk" action={<Button loading={loading} onClick={loadQueue}>Refresh Queue</Button>}>
          <div className="space-y-2">
            <Input placeholder="Patient ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
            <Input placeholder="Appointment ID" value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} />
            <Button loading={loading} onClick={generateToken}>Generate Token</Button>
          </div>
        </Card>

        <Card title="Generated Token">
          {generatedToken ? (
            <pre className="log">{JSON.stringify(generatedToken, null, 2)}</pre>
          ) : (
            <p className="muted text-sm">No tokens generated yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
