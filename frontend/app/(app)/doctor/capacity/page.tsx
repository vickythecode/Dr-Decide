"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useToast } from "@/context/ToastContext";
import { doctorDashboardStats } from "@/lib/services";

type HourCapacity = {
  time: string;
  booked: number;
  limit: number;
};

export default function DoctorCapacityPage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [hourly, setHourly] = useState<HourCapacity[]>([]);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await doctorDashboardStats();
      setHourly(res.hourly_capacity || []);
      setDailyLimit(res.metrics.today_appointments_limit);
    } catch {
      pushToast("Failed to load capacity", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  function adjustDailyLimit(delta: number) {
    setDailyLimit((prev) => Math.max(1, Math.min(200, (prev ?? 1) + delta)));
  }

  return (
    <Card title="Capacity Settings" action={<Button loading={loading} onClick={load}>Reload</Button>}>
      <div className="mb-4 flex items-center gap-2">
        <Button variant="secondary" className="px-3 py-1 text-xs" onClick={() => adjustDailyLimit(-1)}>-</Button>
        <span className="pill">Adjust Appointment Limit By Day: {dailyLimit ?? "-"}</span>
        <Button variant="secondary" className="px-3 py-1 text-xs" onClick={() => adjustDailyLimit(1)}>+</Button>
      </div>
      <div className="space-y-4">
        {hourly.map((item) => {
          const percent = item.limit ? Math.min(100, (item.booked / item.limit) * 100) : 0;
          return (
            <div key={item.time} className="rounded-xl border border-[var(--border)] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold">{item.time}</p>
                <p className="text-sm">{item.booked}/{item.limit} booked</p>
              </div>
              <div className="h-3 rounded-full bg-[#dceff1]">
                <div className="h-3 rounded-full bg-[var(--teal)]" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
        {!hourly.length && <p className="muted text-sm">No hourly capacity available.</p>}
      </div>
    </Card>
  );
}
