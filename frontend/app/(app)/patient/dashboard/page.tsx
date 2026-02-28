"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { patientAppointments, patientCarePlan, patientNotifications } from "@/lib/services";
import { AppointmentItem } from "@/types";
import { useToast } from "@/context/ToastContext";
import { parseCarePlanText } from "@/lib/care-plan";
import { formatDateTimeIST } from "@/lib/datetime";

export default function PatientDashboardPage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [careTasks, setCareTasks] = useState<string[]>([]);
  const [summaryItems, setSummaryItems] = useState<string[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const run = async () => {
      try {
        const [appts, carePlan, notifs] = await Promise.all([
          patientAppointments(),
          patientCarePlan(),
          patientNotifications(),
        ]);

        const upcoming = (appts.appointments || []).slice(0, 4);
        setAppointments(upcoming);

        const parsedPlan = parseCarePlanText(carePlan.simplified_plan || "");
        setCareTasks(parsedPlan.planLines.slice(0, 4));
        setSummaryItems(
          parsedPlan.summaryLines.length
            ? parsedPlan.summaryLines.slice(0, 4)
            : (notifs.notifications || [])
                .map((item) => item.message)
                .filter(Boolean)
                .slice(0, 4)
        );
        setUnread(notifs.unread_count || 0);
      } catch {
        pushToast("Failed to load patient dashboard", "error");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [pushToast]);

  return (
    <div className="space-y-4">
      <Card title="Patient Dashboard">
        <p className="muted text-sm">
          Upcoming appointments, care plan tasks, and quick medical summarization preview.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Upcoming Appointments">
          <p className="kpi-value">{loading ? "..." : appointments.length}</p>
        </Card>
        <Card title="Active Care Tasks">
          <p className="kpi-value">{loading ? "..." : careTasks.length}</p>
        </Card>
        <Card title="Summaries Available">
          <p className="kpi-value">{loading ? "..." : summaryItems.length}</p>
        </Card>
        <Card title="Unread Notifications">
          <p className="kpi-value">{loading ? "..." : unread}</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          title="Upcoming Appointments"
          action={
            <Link className="pill" href="/patient/my-appointments">
              Read More
            </Link>
          }
        >
          <div className="space-y-2">
            {appointments.map((item) => (
              <div key={item.appointment_id} className="rounded-lg border border-[var(--border)] bg-[#f6fbfc] px-3 py-2 text-sm">
                {formatDateTimeIST(item.appointment_date)} - {item.reason}
              </div>
            ))}
            {!appointments.length && <p className="muted text-sm">No upcoming appointments yet.</p>}
          </div>
        </Card>

        <Card
          title="Care Plan"
          action={
            <Link className="pill" href="/patient/care-plan">
              Read More
            </Link>
          }
        >
          <div className="space-y-2">
            {careTasks.map((task) => (
              <div key={task} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                {task}
              </div>
            ))}
            {!careTasks.length && <p className="muted text-sm">No care plan tasks found.</p>}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          title="Summarization"
          action={
            <Link className="pill" href="/patient/summarization">
              Read More
            </Link>
          }
        >
          <div className="space-y-2">
            {summaryItems.slice(0, 4).map((line) => (
              <div key={line} className="rounded-lg border border-[var(--border)] bg-[#f6fbfc] px-3 py-2 text-sm">
                {line}
              </div>
            ))}
            {!summaryItems.length && <p className="muted text-sm">No summaries available right now.</p>}
          </div>
        </Card>

        <Card
          title="Notifications"
          action={
            <Link className="pill" href="/patient/notifications">
              Read More
            </Link>
          }
        >
          <p className="muted text-sm">
            You have {unread} unread items. Visit Notifications for reminders and care updates.
          </p>
        </Card>
      </div>
    </div>
  );
}
