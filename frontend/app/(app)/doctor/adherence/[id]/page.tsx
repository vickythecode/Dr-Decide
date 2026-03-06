"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  Activity, AlertCircle, CheckCircle2, Clock, 
  TrendingUp, CalendarDays, User, ArrowLeft 
} from "lucide-react";
import Card from "@/components/ui/Card";
import { api } from "@/lib/api";

// Define the shape of the data we expect from the backend
type AdherenceLog = {
  id: string;
  task_title: string;
  logged_at: string; // ISO date string
};

type AdherenceStats = {
  appointment_id: string;
  patient_id: string;
  patient_name: string; // NEW: Added field
  adherence_percentage: number;
  total_completed: number;
  last_active: string | null;
  status: "On Track" | "Needs Attention" | "Critical";
  recent_logs: AdherenceLog[];
};

export default function DoctorPatientDetailView() {
  const params = useParams();
  const appointmentId = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AdherenceStats | null>(null);

  const loadStats = useCallback(async () => {
    if (!appointmentId) return;
    
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token"); 
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      const response = await api.get(`/api/adherence/stats/${appointmentId}`, config);
      const data = response.data;
      
      setStats({
        appointment_id: data.appointment_id || appointmentId,
        patient_id: data.patient_id || "Unknown",
        patient_name: data.patient_name || "Unknown Patient", // NEW: Mapping name
        adherence_percentage: data.adherence_percentage || 0,
        total_completed: data.total_completed || 0,
        last_active: data.last_active || null,
        status: data.status || "Needs Attention",
        recent_logs: data.recent_logs || [], 
      });

    } catch (err) {
      console.error("Failed to load patient adherence stats", err);
      setError("Unable to load patient details. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-gray-500">
        <Activity className="h-8 w-8 animate-spin text-[var(--teal)] opacity-80" />
        <p className="text-sm font-medium animate-pulse">Loading patient details...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        <Link href="/doctor/adherence" className="inline-flex items-center text-sm font-bold text-[var(--teal)] hover:underline mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>
        <Card className="flex flex-col items-center justify-center p-12 text-center border-red-100 bg-red-50">
          <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
          <h3 className="text-lg font-bold text-red-800">Data Not Found</h3>
          <p className="mt-1 text-sm text-red-600">{error || "No adherence data found for this appointment."}</p>
        </Card>
      </div>
    );
  }

  const isGood = stats.status === "On Track";
  const isCritical = stats.status === "Critical";
  const statusColor = isGood ? "text-green-700 bg-green-50 border-green-200" : isCritical ? "text-red-700 bg-red-50 border-red-200" : "text-orange-700 bg-orange-50 border-orange-200";
  const ringColor = isGood ? "text-green-500" : isCritical ? "text-red-500" : "text-orange-500";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      
      <Link href="/doctor/adherence" className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-[var(--teal)] transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Patient List
      </Link>

      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-100 pb-6 md:flex-row md:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          {/* UPDATED: Showing Patient Name as the main title */}
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            {stats.patient_name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-md border border-gray-100">
              <User className="h-4 w-4 text-gray-400" /> Patient ID: {stats.patient_id}
            </span>
            <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-md border border-gray-100">
              <CalendarDays className="h-4 w-4 text-gray-400" /> Appt: {stats.appointment_id.substring(0, 8)}
            </span>
          </div>
        </div>
        <div className={`rounded-full border px-4 py-1.5 text-sm font-bold uppercase tracking-wide ${statusColor}`}>
          {stats.status}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="flex flex-col items-center justify-center py-8 text-center">
          <h3 className="mb-4 text-sm font-bold text-gray-500 uppercase tracking-wider">Overall Compliance</h3>
          <div className="relative flex h-28 w-28 items-center justify-center">
            <svg className="h-full w-full -rotate-90 transform">
              <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-gray-100" />
              <circle 
                cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="10" fill="transparent" 
                strokeDasharray={301.6} 
                strokeDashoffset={301.6 - (301.6 * stats.adherence_percentage) / 100}
                className={`transition-all duration-1000 ease-out ${ringColor}`} 
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-black ${isGood ? "text-green-600" : isCritical ? "text-red-600" : "text-orange-600"}`}>
                {stats.adherence_percentage}%
              </span>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-center p-6">
          <div className="flex items-center gap-3 text-[var(--teal)] mb-3">
            <div className="bg-teal-50 p-2 rounded-lg">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-gray-700">Tasks Logged</h3>
          </div>
          <p className="text-4xl font-black text-gray-900">{stats.total_completed}</p>
          <p className="mt-2 text-sm text-gray-500">Total recovery steps completed by the patient since the plan was generated.</p>
        </Card>

        <Card className="flex flex-col justify-center p-6">
          <div className="flex items-center gap-3 text-blue-500 mb-3">
            <div className="bg-blue-50 p-2 rounded-lg">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-gray-700">Last Active</h3>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {stats.last_active ? new Date(stats.last_active).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Never"}
          </p>
          <p className="mt-2 text-sm text-gray-500">The last time the patient interacted with their digital care plan.</p>
        </Card>
      </div>

      <Card title="Recent Patient Activity" className="min-h-[300px]">
        {stats.recent_logs && stats.recent_logs.length > 0 ? (
          <div className="relative border-l-2 border-gray-100 ml-4 space-y-8 py-4">
            {stats.recent_logs.map((log, idx) => (
              <div key={log.id || idx} className="relative pl-6">
                <div className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-white bg-[var(--teal)] shadow-sm"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-100 flex-1">
                    <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" /> Marked Task Complete
                    </p>
                    <p className="text-sm text-gray-600 mt-1 pl-6">"{log.task_title}"</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-gray-500 bg-white border border-gray-200 px-2.5 py-1.5 rounded-md shadow-sm">
                    {new Date(log.logged_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <TrendingUp className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">No activity logged yet.</p>
            <p className="text-xs text-gray-500 mt-1">The patient has not checked off any tasks for this care plan.</p>
          </div>
        )}
      </Card>
    </div>
  );
}