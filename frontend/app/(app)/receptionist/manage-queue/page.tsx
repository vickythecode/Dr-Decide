"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, Clock, PlayCircle, CheckCircle, RefreshCw } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useToast } from "@/context/ToastContext";
import { firstPresent, formatNameWithId } from "@/lib/display";
import { resolvePatientName } from "@/lib/identity";
import { hospitalQueue, updateAppointmentStatus } from "@/lib/services";

export default function ReceptionistManageQueuePage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [queue, setQueue] = useState<Array<Record<string, any>>>([]);

  // --- LOAD QUEUE FROM DYNAMODB ---
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Calls GET /api/hospital/queue-status
      const res = await hospitalQueue();
      // Sort queue by token number so it's sequential
      const sortedQueue = (res.current_queue || []).sort(
        (a: any, b: any) => Number(a.token_number) - Number(b.token_number)
      );
      setQueue(sortedQueue);
    } catch {
      pushToast("Failed to load queue status", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  // --- UPDATE STATUS (WAITING -> IN CONSULTATION -> COMPLETED) ---
  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      await updateAppointmentStatus(appointmentId, newStatus);
      pushToast(`Patient status updated to ${newStatus}`, "success");
      load(); // Reload to reflect changes
    } catch {
      pushToast("Failed to update status", "error");
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000); // Auto-refresh every 15 seconds
    return () => clearInterval(timer);
  }, [load]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-[var(--teal)]" />
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Live Queue Management</h1>
        </div>
        <Button 
          variant="secondary" 
          className="flex items-center gap-2" 
          onClick={load} 
          loading={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-sm text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-semibold">Token</th>
                <th className="p-4 font-semibold">Patient Information</th>
                <th className="p-4 font-semibold">Appointment ID</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {queue.map((row, idx) => (
                <tr key={`${String(row.token_number || idx)}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <span className="text-lg font-black text-[var(--teal)]">
                      T-{String(row.token_number || "-").padStart(3, '0')}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-[var(--foreground)]">
                      {firstPresent(row, ["patient_name", "patient_full_name", "full_name", "name"]) ||
                        resolvePatientName(String(row.patient_id || ""))}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">ID: {String(row.patient_id).slice(0, 8)}...</div>
                  </td>
                  <td className="p-4 font-mono text-sm">{String(row.appointment_id || "-")}</td>
                  <td className="p-4">
                    {row.status === "Waiting" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 uppercase tracking-wide">
                        <Clock className="w-3 h-3 mr-1" /> Waiting
                      </span>
                    )}
                    {row.status === "In-Consultation" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-[var(--teal)] uppercase tracking-wide animate-pulse">
                        <PlayCircle className="w-3 h-3 mr-1" /> In Room
                      </span>
                    )}
                    {row.status === "Completed" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 uppercase tracking-wide">
                        <CheckCircle className="w-3 h-3 mr-1" /> Done
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {row.status === "Waiting" && (
                      <Button 
                        className="text-xs px-3 py-1.5" 
                        onClick={() => handleStatusUpdate(row.appointment_id, "In-Consultation")}
                      >
                        Call Patient
                      </Button>
                    )}
                    {row.status === "In-Consultation" && (
                      <Button 
                        variant="secondary" 
                        className="text-xs px-3 py-1.5 text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => handleStatusUpdate(row.appointment_id, "Completed")}
                      >
                        Complete
                      </Button>
                    )}
                    {row.status === "Completed" && (
                      <span className="text-xs text-gray-400 font-medium italic">Checked Out</span>
                    )}
                  </td>
                </tr>
              ))}
              
              {!queue.length && !loading && (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="flex flex-col items-center">
                      <Users className="w-12 h-12 text-gray-200 mb-2" />
                      <p className="text-gray-500 font-medium">The queue is currently empty.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      <p className="text-center text-[10px] text-gray-400 uppercase tracking-widest">
        Auto-refreshing every 15 seconds to sync with hospital database
      </p>
    </div>
  );
}