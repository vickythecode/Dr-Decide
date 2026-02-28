"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useToast } from "@/context/ToastContext";
import { patientAppointments, patientCarePlan, patientNotifications } from "@/lib/services";
import { parseCarePlanText } from "@/lib/care-plan";
import { formatDateTimeIST } from "@/lib/datetime";

type SummaryBlock = {
  title: string;
  lines: string[];
};

export default function PatientSummarizationPage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [blocks, setBlocks] = useState<SummaryBlock[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [appointmentsRes, planRes, notificationsRes] = await Promise.all([
        patientAppointments(),
        patientCarePlan(),
        patientNotifications(),
      ]);

      const appointmentLines = (appointmentsRes.appointments || []).slice(0, 3).map((item) => {
        return `${formatDateTimeIST(item.appointment_date)} - ${item.reason} (${item.status})`;
      });

      const parsedPlan = parseCarePlanText(planRes.simplified_plan || "");
      const planLines = parsedPlan.planLines.slice(0, 3);
      const carePlanSummaryLines = parsedPlan.summaryLines.slice(0, 3);

      const notificationLines = (notificationsRes.notifications || [])
        .map((item) => item.message)
        .filter(Boolean)
        .slice(0, 3);

      const nextBlocks: SummaryBlock[] = [];
      if (appointmentLines.length) {
        nextBlocks.push({ title: "Appointments Summary", lines: appointmentLines });
      }
      if (planLines.length) {
        nextBlocks.push({ title: "Care Plan Summary", lines: planLines });
      }
      if (carePlanSummaryLines.length) {
        nextBlocks.push({ title: "Consultation Summarization", lines: carePlanSummaryLines });
      }
      if (notificationLines.length) {
        nextBlocks.push({ title: "Notifications Summary", lines: notificationLines });
      }
      setBlocks(nextBlocks);
    } catch {
      pushToast("Failed to load summarization", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card title="Summarization History" action={<Button loading={loading} onClick={load}>Refresh</Button>}>
      <div className="space-y-3">
        {blocks.map((item) => (
          <div key={item.title} className="rounded-xl border border-[var(--border)] bg-[#f7fbfc] p-3">
            <p className="section-title">{item.title}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {item.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
        {!blocks.length && <p className="muted text-sm">No summary data available.</p>}
      </div>
    </Card>
  );
}
