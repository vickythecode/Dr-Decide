"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertCircle, ChevronRight, Search, Users, RefreshCw } from "lucide-react";
import Card from "@/components/ui/Card";
import { api } from "@/lib/api";

type PatientSummary = {
  appointment_id: string;
  patient_id: string;
  patient_name?: string; // NEW: Added patient_name (optional just in case it's missing)
  adherence_percentage: number;
  status: "On Track" | "Needs Attention" | "Critical";
  last_active: string;
};

export default function AllPatientsDashboard() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAllPatients = async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      
      const response = await api.get("/api/adherence/all-stats");
      setPatients(response.data || []);
    } catch (err) {
      console.error("Failed to fetch patients summary", err);
      setError("Unable to load patient data. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPatients();
  }, []);

  // UPDATED FILTER: Now checks patient_name, patient_id, and appointment_id
  const filteredPatients = patients.filter((patient) => {
    const query = searchQuery.toLowerCase();
    const safePatientName = (patient.patient_name || "").toLowerCase();
    const safePatientId = (patient.patient_id || "").toLowerCase();
    const safeAppointmentId = (patient.appointment_id || "").toLowerCase();
    
    return (
      safePatientName.includes(query) || 
      safePatientId.includes(query) || 
      safeAppointmentId.includes(query)
    );
  });

  // 1. LOADING STATE
  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-gray-500">
        <Activity className="h-8 w-8 animate-spin text-[var(--teal)] opacity-80" />
        <p className="text-sm font-medium animate-pulse">Loading patient data...</p>
      </div>
    );
  }

  // 2. ERROR STATE
  if (error) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 pb-12">
        <Card className="flex flex-col items-center justify-center p-12 text-center border-red-100 bg-red-50">
          <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
          <h3 className="text-lg font-bold text-red-800">Connection Error</h3>
          <p className="mt-1 text-sm text-red-600 mb-6">{error}</p>
          <button 
            onClick={fetchAllPatients}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-red-700 shadow-sm border border-red-200 hover:bg-red-50"
          >
            <RefreshCw className="h-4 w-4" /> Try Again
          </button>
        </Card>
      </div>
    );
  }

  // 3. MAIN DASHBOARD
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-100 pb-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            Patient Overview
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Monitor adherence and recovery status across all active patients.
          </p>
        </div>
        
        {/* UPDATED: Search placeholder mentions Patient Name */}
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm focus-within:border-[var(--teal)] focus-within:ring-1 focus-within:ring-[var(--teal)] w-full md:w-72 transition-all">
          <Search className="h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search name, patient ID, or appt ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-none text-sm outline-none focus:ring-0 bg-transparent w-full"
          />
        </div>
      </div>

      {/* PATIENT LIST CARD */}
      <Card className="overflow-hidden p-0">
        {filteredPatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center text-gray-500">
            <Users className="mb-4 h-12 w-12 text-gray-200" />
            <h3 className="text-lg font-bold text-gray-700">No patients found</h3>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery ? `No results matching "${searchQuery}"` : "You don't have any active patient recovery plans yet."}
            </p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="mt-4 text-[var(--teal)] text-sm font-bold hover:underline"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/80 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                <tr>
                  {/* UPDATED: Changed column header to Patient Name */}
                  <th className="px-6 py-4 font-bold">Patient Name</th>
                  <th className="px-6 py-4 font-bold hidden sm:table-cell">Appt ID</th>
                  <th className="px-6 py-4 font-bold">Compliance</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold hidden md:table-cell">Last Active</th>
                  <th className="px-6 py-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredPatients.map((patient) => {
                  const isGood = patient.status === "On Track";
                  const isCritical = patient.status === "Critical";
                  
                  return (
                    <tr key={patient.appointment_id} className="transition-colors hover:bg-gray-50/50 group">
                      {/* UPDATED: Display Patient Name, with fallback to Patient ID */}
                      <td className="whitespace-nowrap px-6 py-4 font-bold text-gray-900">
                        {patient.patient_name || patient.patient_id}
                        {/* Optional: Add a small subtitle for the ID if you want to show both */}
                        {patient.patient_name && (
                          <div className="text-xs text-gray-400 font-normal mt-0.5">ID: {patient.patient_id}</div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-400 hidden sm:table-cell font-mono text-xs">
                        {patient.appointment_id.substring(0, 8)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-100">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${isGood ? 'bg-green-500' : isCritical ? 'bg-red-500' : 'bg-orange-500'}`}
                              style={{ width: `${patient.adherence_percentage}%` }}
                            ></div>
                          </div>
                          <span className={`text-xs font-bold ${isGood ? 'text-green-700' : isCritical ? 'text-red-700' : 'text-orange-700'}`}>
                            {patient.adherence_percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                          isGood ? "bg-green-50 text-green-700 border border-green-200" : 
                          isCritical ? "bg-red-50 text-red-700 border border-red-200" : 
                          "bg-orange-50 text-orange-700 border border-orange-200"
                        }`}>
                          {patient.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-xs text-gray-500 hidden md:table-cell">
                        {patient.last_active ? new Date(patient.last_active).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/doctor/adherence/${patient.appointment_id}`}
                          className="inline-flex items-center justify-center rounded-lg bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 transition-all hover:bg-[var(--teal)] hover:text-white hover:border-[var(--teal)] group-hover:shadow-sm"
                        >
                          Details <ChevronRight className="ml-1 h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}