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

            const parsed = parseCarePlanText(planData.simplified_plan || "");
            setPlanLines(parsed.planLines);
            setSummaryLines(parsed.summaryLines);
            setRawPlanText(parsed.rawText);

            const parsedTasks = parsed.planLines
                .map((item, index) => ({
                    id: `task_${activeAppointmentId}_${index}`,
                    title: item,
                    done: false,
                }))
                .filter((task) => task.title);

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
        if (!plan?.appointment_id) return;

        setLoading(true);
        try {
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

    const formattedFollowUpDate = plan?.follow_up_date 
        ? new Date(plan.follow_up_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : "Not specified";

    // --- NEW: Check if the plan is completed! ---
    // Compare YYYY-MM-DD strings so timezones don't mess it up
    const todayStr = new Date().toISOString().split("T")[0];
    const isPlanActive = plan?.follow_up_date ? todayStr <= plan.follow_up_date : true;

    return (
        <div className="space-y-4 max-w-5xl mx-auto px-2 sm:px-0 pb-12">
            {loading && !plan ? (
                // --- SKELETON LOADER ---
                <Card title="Loading Care Plan..."><Skeleton className="h-40 w-full" /></Card>
            ) : (
                // --- MAIN CONTENT ---
                <>
                    {/* 1. PROGRESS BAR & TASKS (OR COMPLETION MESSAGE) */}
                    {!isPlanActive ? (
                        <Card title="Care Plan Complete!">
                            <div className="text-center p-8 bg-green-50 rounded-lg border border-green-200">
                                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-green-800 mb-2">You reached your target date!</h3>
                                <p className="text-green-700">Your daily tracking is complete. Please visit the clinic for your scheduled follow-up assessment.</p>
                            </div>
                        </Card>
                    ) : (
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
                            </div>
                        </Card>
                    )}

                    {/* ... Rest of your UI (Summarization, Follow-Up Schedule) remains exactly the same ... */}
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
                            </div>
                        </Card>

                        {/* 3. FOLLOW UP & RAW TEXT */}
                        <div className="space-y-6">
                            <Card title="Follow-Up Schedule">
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100 text-sm text-indigo-900">
                                        <Calendar className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-indigo-950 mb-0.5">Target Date</p>
                                            <p>{formattedFollowUpDate}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 p-4 bg-orange-50/50 rounded-lg border border-orange-100 text-sm text-orange-900">
                                        <FileText className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-orange-950 mb-0.5">Doctor's Instructions</p>
                                            <p className="leading-relaxed">{plan?.follow_up_reminder || "No specific instructions provided."}</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}