"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useToast } from "@/context/ToastContext";
import { patientNotifications } from "@/lib/services";
import { NotificationItem } from "@/types";
import { formatDateTimeIST } from "@/lib/datetime";

export default function PatientNotificationsPage() {
  const { pushToast } = useToast();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await patientNotifications();
      setItems(res.notifications || []);
      setUnread(res.unread_count || 0);
    } catch {
      pushToast("Failed to load notifications", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card
      title={`Notifications (${unread} unread)`}
      action={<Button loading={loading} onClick={load}>Refresh</Button>}
    >
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={`${item.notification_id || idx}`} className="rounded-lg border border-[var(--border)] p-3">
            <p className="text-sm">{item.message}</p>
            <p className="muted mt-1 text-xs">
              {item.timestamp ? formatDateTimeIST(item.timestamp) : "No timestamp"} | {item.status || "Unknown"}
            </p>
          </div>
        ))}
        {!items.length && <p className="muted text-sm">No notifications yet.</p>}
      </div>
    </Card>
  );
}
