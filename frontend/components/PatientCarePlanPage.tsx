"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Clock, Activity, Calendar, FileText } from "lucide-react";
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
        setLoading(true);
        try {
            let planData;
            let activeAppointmentId = appointmentId;

            // 1. Fetch the Base Care Plan
            if (appointmentId) {
                const response = await api.get(`/api/patient/care-plan/${appointmentId}`);
                planData = response.data;
            } else {
                planData = await patientCarePlan();
                if (!planData || !planData.appointment_id) {
                    throw new Error("No recent care plan found.");
                }
                activeAppointmentId = planData.appointment_id;
            }

            setPlan(planData);

            // Parse text/JSON logic
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
                    const rawTodaysCompleted = statsRes.data.todays_completed_tasks || [];
                    const todaysCompleted = Array.from(new Set(rawTodaysCompleted)) as string[];

                    setCompletedToday(todaysCompleted);

                    const updatedTasks = parsedTasks.map(task => ({
                        ...task,
                        done: todaysCompleted.includes(task.id)
                    }));
                    setTasks(updatedTasks.slice(0, 8));
                } catch (statsError) {
                    console.error("Could not fetch adherence stats", statsError);
                    setTasks(parsedTasks.slice(0, 8));
                }
            } else {
                setTasks(parsedTasks.slice(0, 8));
            }

        } catch {
            pushToast("Care plan not available or no recent appointments found.", "error");
        } finally {
            setLoading(false);
        }
    }, [appointmentId, pushToast]); 

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

            await api.post("/api/adherence/log", {
                appointment_id: plan.appointment_id,
                doctor_id: plan.doctor_id || "unknown",
                patient_id: plan.patient_id || "unknown",
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

    const progressPercent = tasks.length > 0 ? (completedToday.length / tasks.length) * 100 : 0;

    // Helper to format the date nicely
    const formattedFollowUpDate = plan?.follow_up_date 
        ? new Date(plan.follow_up_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : "Not specified";

    return (
        <div className="space-y-4 max-w-5xl mx-auto px-2 sm:px-0 pb-12">
            {loading && !plan ? (
                // --- SKELETON LOADER ---
                <>
                    <Card title={`Daily Recovery Tasks - ${new Date().toLocaleDateString()}`}>
                        <div className="mb-6 space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-2.5 w-full rounded-full" />
                        </div>
                        <div className="space-y-2">
                            {Array.from({ length: 4 }).map((_, idx) => (
                                <div key={`task-skeleton-${idx}`} className="rounded-xl border p-4 border-[var(--border)] bg-white">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <Skeleton className="h-4 w-full sm:w-3/4" />
                                        <Skeleton className="h-8 w-full sm:w-28 rounded-md" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card title="Visit Summarization">
                            <div className="space-y-3">
                                {Array.from({ length: 3 }).map((_, idx) => (
                                    <Skeleton key={`summary-skeleton-${idx}`} className="h-12 w-full rounded-lg" />
                                ))}
                            </div>
                        </Card>
                        <div className="space-y-6">
                            <Card title="Follow-Up Schedule">
                                <Skeleton className="h-24 w-full rounded-lg" />
                            </Card>
                        </div>
                    </div>
                </>
            ) : (
                // --- MAIN CONTENT ---
                <>
                    {/* 1. PROGRESS BAR & TASKS */}
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

                        <div className="space-y-3">
                            {tasks.map((task) => (
                                <div
                                    key={task.id}
                                    className={`flex flex-col gap-3 rounded-xl border p-4 transition-all sm:flex-row sm:items-center sm:justify-between ${
                                        task.done ? "bg-green-50/50 border-green-200 opacity-90" : "bg-white border-[var(--border)] shadow-sm hover:border-[var(--teal)]"
                                    }`}
                                >
                                    <div className="flex w-full flex-1 items-start gap-3 pl-1">
                                        <Clock className={`w-5 h-5 shrink-0 mt-0.5 ${task.done ? "text-green-500" : "text-[var(--teal)]"}`} />
                                        <p className={`text-sm leading-relaxed ${task.done ? "line-through text-green-700" : "text-gray-800 font-medium"}`}>
                                            {task.title}
                                        </p>
                                    </div>

                                    <Button
                                        className={`w-full sm:w-auto shrink-0 shadow-sm ${task.done ? "bg-green-500 hover:bg-green-600 text-white border-none" : ""}`}
                                        variant={task.done ? "secondary" : "primary"}
                                        disabled={task.done}
                                        onClick={() => markDone(task.id, task.title)}
                                    >
                                        {task.done ? <CheckCircle2 className="w-4 h-4 mr-1.5" /> : ""}
                                        {task.done ? "Completed" : "Mark Done"}
                                    </Button>
                                </div>
                            ))}
                            {!tasks.length && (
                                <div className="text-center p-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    <p className="text-gray-500 text-sm">No tasks assigned for today. Rest up!</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-6 items-start">
                        {/* 2. SUMMARIZATION */}
                        <Card title="Visit Summarization">
                            <div className="space-y-3">
                                {summaryLines.map((line, idx) => (
                                    <div key={idx} className="flex gap-3 p-3 bg-blue-50/40 rounded-lg border border-blue-100/50 text-sm text-gray-700">
                                        <Activity className="w-4 h-4 text-[var(--teal)] shrink-0 mt-0.5" />
                                        <span className="leading-relaxed">{line}</span>
                                    </div>
                                ))}
                                {!summaryLines.length && <p className="text-gray-500 text-sm italic">No summarization notes available.</p>}
                            </div>
                        </Card>

                        {/* 3. FOLLOW UP & RAW TEXT */}
                        <div className="space-y-6">
                            
                            {/* NEW: COMBINED FOLLOW-UP CARD */}
                            <Card title="Follow-Up Schedule">
                                <div className="space-y-4">
                                    {/* Date Section */}
                                    <div className="flex items-start gap-3 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100 text-sm text-indigo-900">
                                        <Calendar className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-indigo-950 mb-0.5">Target Date</p>
                                            <p>{formattedFollowUpDate}</p>
                                        </div>
                                    </div>

                                    {/* Instructions Section */}
                                    <div className="flex items-start gap-3 p-4 bg-orange-50/50 rounded-lg border border-orange-100 text-sm text-orange-900">
                                        <FileText className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-orange-950 mb-0.5">Doctor's Instructions</p>
                                            <p className="leading-relaxed">{plan?.follow_up_reminder || "No specific instructions provided."}</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {!!rawPlanText && (
                                <Card title="Additional Clinical Notes">
                                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700 p-4 bg-gray-50/80 rounded-lg border border-gray-200">
                                        {rawPlanText}
                                    </p>
                                </Card>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}