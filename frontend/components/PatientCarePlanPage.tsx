"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Clock, Activity, Calendar } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/context/ToastContext";
import { patientCarePlan } from "@/lib/services";
import { parseCarePlanText } from "@/lib/care-plan";
import { api } from "@/lib/api";

type PlanTask = {
    id: string;
    title: string;
    done: boolean;
};

export default function PatientCarePlanPage() {
    const params = useParams();
    const appointmentId = params?.id as string;

    const { pushToast } = useToast();
    const [loading, setLoading] = useState(false);

    // Base Care Plan States
    const [plan, setPlan] = useState<any>(null);
    const [planLines, setPlanLines] = useState<string[]>([]);
    const [summaryLines, setSummaryLines] = useState<string[]>([]);
    const [rawPlanText, setRawPlanText] = useState("");

    // Adherence Tracking States
    const [tasks, setTasks] = useState<PlanTask[]>([]);
    const [completedToday, setCompletedToday] = useState<string[]>([]);

    const loadPlan = useCallback(async () => {
        // FIX: Remove the restrictive check that was blocking the recent plan fetch
        // if (!appointmentId && params !== null) return; 

        setLoading(true);
        try {
            let planData;
            let activeAppointmentId = appointmentId;

            // 1. Fetch the Base Care Plan
            if (appointmentId) {
                // We have an ID in the URL, fetch that specific plan
                const response = await api.get(`/api/patient/care-plan/${appointmentId}`);
                planData = response.data;
            } else {
                // No ID in URL, fetch the most recent plan
                planData = await patientCarePlan();
                if (!planData || !planData.appointment_id) {
                    throw new Error("No recent care plan found.");
                }
                activeAppointmentId = planData.appointment_id; // Capture ID from recent plan
            }

            setPlan(planData);

            // Parse text/JSON logic via your helper
            const parsed = parseCarePlanText(planData.simplified_plan || "");
            setPlanLines(parsed.planLines);
            setSummaryLines(parsed.summaryLines);
            setRawPlanText(parsed.rawText);

            // 2. Build the Task List
            const parsedTasks = parsed.planLines
                .map((item, index) => ({
                    id: `task_${activeAppointmentId}_${index}`,
                    title: item,
                    done: false,
                }))
                .filter((task) => task.title);

            // 3. Fetch Adherence Logs for Today
            if (activeAppointmentId) {
                try {
                    const statsRes = await api.get(`/api/adherence/stats/${activeAppointmentId}`);

                    // Use Set to prevent duplicate IDs causing progress to go over 100%
                    const rawTodaysCompleted = statsRes.data.todays_completed_tasks || [];
                    const todaysCompleted = Array.from(new Set(rawTodaysCompleted)) as string[];

                    setCompletedToday(todaysCompleted);

                    // Mark tasks as done if their ID is in today's completed list
                    const updatedTasks = parsedTasks.map(task => ({
                        ...task,
                        done: todaysCompleted.includes(task.id)
                    }));
                    setTasks(updatedTasks.slice(0, 8));
                } catch (statsError) {
                    console.error("Could not fetch adherence stats", statsError);
                    setTasks(parsedTasks.slice(0, 8)); // Fallback to all uncompleted
                }
            } else {
                setTasks(parsedTasks.slice(0, 8));
            }

        } catch {
            pushToast("Care plan not available or no recent appointments found.", "error");
        } finally {
            setLoading(false);
        }
    }, [appointmentId, pushToast]); // FIX: Removed 'params' from dependency array
    async function markDone(taskId: string, title: string) {
        if (!plan?.appointment_id) {
            pushToast("Cannot log task: Missing appointment reference", "error");
            return;
        }

        setLoading(true);
        try {
            // Optimistic Update
            setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, done: true } : task)));
            setCompletedToday((prev) => [...prev, taskId]);

            // Connect to the POST /log route we built
            await api.post("/api/adherence/log", {
                appointment_id: plan.appointment_id,
                patient_id: plan.patient_id || "unknown", // Backend can extract from token if needed
                task_id: taskId,
                task_title: title
            });

            pushToast("Task logged for today!", "success");
        } catch {
            // Revert optimistic update on failure
            setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, done: false } : task)));
            setCompletedToday((prev) => prev.filter(id => id !== taskId));
            pushToast("Failed to mark task done", "error");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadPlan();
    }, [loadPlan]);

    // Calculate Progress
    const progressPercent = tasks.length > 0 ? (completedToday.length / tasks.length) * 100 : 0;

    return (
        <div className="space-y-3 max-w-4xl mx-auto px-2 sm:px-0">
            {loading && !plan ? (
                <>
                    <Card title={`Daily Recovery Tasks - ${new Date().toLocaleDateString()}`}>
                        <div className="mb-6 space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-2.5 w-full rounded-full" />
                        </div>
                        <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, idx) => (
                                <div key={`task-skeleton-${idx}`} className="rounded-xl border p-4 border-[var(--border)] bg-white">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <Skeleton className="h-4 w-full sm:w-3/4" />
                                        <Skeleton className="h-6 w-full sm:w-24 rounded-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card title="Visit Summarization">
                            <div className="space-y-3">
                                {Array.from({ length: 3 }).map((_, idx) => (
                                    <Skeleton key={`summary-skeleton-${idx}`} className="h-14 w-full rounded-lg" />
                                ))}
                            </div>
                        </Card>
                        <div className="space-y-6">
                            <Card title="Follow Up Reminder">
                                <Skeleton className="h-16 w-full rounded-lg" />
                            </Card>
                            <Card title="Additional Notes">
                                <Skeleton className="h-24 w-full rounded-md" />
                            </Card>
                        </div>
                    </div>
                </>
            ) : (
                <>

            {/* 1. PROGRESS BAR WIDGET */}
            <Card title={`Daily Recovery Tasks - ${new Date().toLocaleDateString()}`}>
                <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2 font-medium">
                        <span className="text-gray-500">Today's Progress</span>
                        <span className="text-[var(--teal)]">{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div
                            className="bg-[var(--teal)] h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                </div>

                <div className="space-y-2">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${task.done ? "bg-green-50/50 border-green-100 opacity-80" : "bg-white border-[var(--border)]"
                                }`}
                        >
                            
                            <div className="flex w-full flex-1 items-center gap-2 pl-1">
                                <Clock className={`w-5 h-5 shrink-0 ${task.done ? "text-green-500" : "text-[var(--teal)]"}`} />
                                <p className={`text-sm ${task.done ? "line-through text-green-700" : "text-gray-700 font-medium"}`}>
                                    {task.title}
                                </p>
                            </div>

                            <Button
                                className={` w-full sm:w-auto ${task.done ? "bg-green-500 text-white border-none" : ""}`}
                                variant={task.done ? "secondary" : "primary"}
                                disabled={task.done}
                                onClick={() => markDone(task.id, task.title)}
                            >
                                {task.done ? <CheckCircle2 className="w-4 h-4 mr-1 text-sm" /> : ""}
                                {task.done ? "Completed" : "Mark Done"}
                            </Button>
                        </div>
                    ))}
                    {!tasks.length && <p className="muted text-sm p-2">No tasks available for today.</p>}
                </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                {/* 2. SUMMARIZATION */}
                <Card title="Visit Summarization">
                    <div className="space-y-3">
                        {summaryLines.map((line) => (
                            <div key={line} className="flex gap-3 p-3 bg-[#f6fbfc] rounded-lg border border-[var(--border)] text-sm text-gray-700">
                                <Activity className="w-4 h-4 text-[var(--teal)] shrink-0 mt-0.5" />
                                {line}
                            </div>
                        ))}
                        {!summaryLines.length && <p className="muted text-sm">No summarization lines available.</p>}
                    </div>
                </Card>

                {/* 3. FOLLOW UP & RAW TEXT */}
                <div className="space-y-6">
                    <Card title="Follow Up Reminder">
                        <div className="flex gap-3 p-4 bg-orange-50/50 rounded-lg border border-orange-100 text-sm text-orange-900">
                            <Calendar className="w-5 h-5 text-orange-500 shrink-0" />
                            <p>{plan?.follow_up_reminder || "No specific follow-up required."}</p>
                        </div>
                    </Card>

                    {!!rawPlanText && (
                        <Card title="Additional Notes">
                            <p className="whitespace-pre-wrap break-words text-sm text-gray-600 p-2 bg-gray-50 rounded-md border border-gray-100">{rawPlanText}</p>
                        </Card>
                    )}
                </div>
            </div>
                </>
            )}
        </div>
    );
}
