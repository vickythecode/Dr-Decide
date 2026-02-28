"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useToast } from "@/context/ToastContext";
import { logTask, patientCarePlan } from "@/lib/services";
import { parseCarePlanText } from "@/lib/care-plan";

type PlanTask = {
  id: string;
  title: string;
  done: boolean;
};

export default function PatientCarePlanPage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<{
    simplified_plan: string;
    follow_up_reminder: string;
    status: string;
  } | null>(null);
  const [planLines, setPlanLines] = useState<string[]>([]);
  const [summaryLines, setSummaryLines] = useState<string[]>([]);
  const [rawPlanText, setRawPlanText] = useState("");
  const [tasks, setTasks] = useState<PlanTask[]>([]);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await patientCarePlan();
      setPlan(res);
      const parsed = parseCarePlanText(res.simplified_plan || "");
      setPlanLines(parsed.planLines);
      setSummaryLines(parsed.summaryLines);
      setRawPlanText(parsed.rawText);

      const parsedTasks = parsed.planLines
        .map((item, index) => ({
          id: `care_task_${index + 1}`,
          title: item,
          done: false,
        }))
        .filter((task) => task.title);

      setTasks(parsedTasks.slice(0, 8));
    } catch {
      pushToast("Care plan not available", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  async function markDone(taskId: string) {
    setLoading(true);
    try {
      const res = await logTask({ task_id: taskId, status: "Done" });
      pushToast(res.message, "success");
      setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, done: true } : task)));
    } catch {
      pushToast("Failed to mark task done", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  return (
    <div className="space-y-4">
      <Card title="AI Care Plan" action={<Button loading={loading} onClick={loadPlan}>Refresh</Button>}>
        <div className="space-y-2">
          {planLines.map((line) => (
            <div key={line} className="rounded-lg border border-[var(--border)] bg-[#f6fbfc] px-3 py-2 text-sm">
              {line}
            </div>
          ))}
          {!!rawPlanText && <p className="whitespace-pre-wrap text-sm">{rawPlanText}</p>}
          {!planLines.length && !rawPlanText && <p className="text-sm">No care plan found yet.</p>}
        </div>
      </Card>

      <Card title="Follow Up">
        <p className="text-sm">{plan?.follow_up_reminder || "No reminder available."}</p>
      </Card>

      <Card title="Summarization">
        <div className="space-y-2">
          {summaryLines.map((line) => (
            <div key={line} className="rounded-lg border border-[var(--border)] bg-[#f6fbfc] px-3 py-2 text-sm">
              {line}
            </div>
          ))}
          {!summaryLines.length && <p className="muted text-sm">No summarization lines available.</p>}
        </div>
      </Card>

      <Card title="Task Adherence">
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2"
            >
              <p className="text-sm">
                {task.done ? "[x]" : "[ ]"} {task.title}
              </p>
              <Button
                className="px-3 py-1 text-xs"
                variant={task.done ? "secondary" : "primary"}
                disabled={task.done}
                loading={loading}
                onClick={() => markDone(task.id)}
              >
                {task.done ? "Done" : "Mark Done"}
              </Button>
            </div>
          ))}
          {!tasks.length && <p className="muted text-sm">No tasks available.</p>}
        </div>
      </Card>
    </div>
  );
}
