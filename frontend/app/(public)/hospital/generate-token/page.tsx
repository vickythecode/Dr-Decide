"use client";

import { useState } from "react";
import { Ticket, User, Stethoscope, Clock, CheckCircle, Search } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { formatDateTimeIST } from "@/lib/datetime";

// Ensure these three functions are exported in your @/lib/services.ts file!
import { 
  hospitalCheckIn, 
  getAppointmentDetails, 
  updateAppointmentStatus 
} from "@/lib/services";

export default function ReceptionistGenerateTokenPage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [appointmentId, setAppointmentId] = useState("");
  const [tokens, setTokens] = useState<Array<Record<string, any>>>([]);

  async function submit() {
    if (!appointmentId.trim()) {
      pushToast("Please enter an Appointment ID", "error");
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch details using ONLY the appointment ID
      const aptDetails = await getAppointmentDetails(appointmentId);
      
      if (!aptDetails || !aptDetails.patient_id) {
        throw new Error("Invalid appointment data received");
      }

      // 2. Generate the Token using the retrieved patient_id
      const res = await hospitalCheckIn({ 
        patient_id: aptDetails.patient_id, 
        appointment_id: aptDetails.appointment_id 
      });

      // 3. Update the appointment status to "Waiting"
      await updateAppointmentStatus(aptDetails.appointment_id, "Waiting");

      // 4. Construct the beautiful Ticket object for the UI
      const tokenRow = {
        token_number: res.token_number || res.token, 
        patient_name: aptDetails.full_name,
        doctor_id: aptDetails.doctor_id,
        appointment_id: aptDetails.appointment_id,
        status: "Waiting",
        generatedAt: formatDateTimeIST(new Date().toISOString()),
      };

      // Add new ticket to the top of the list
      setTokens((prev) => [tokenRow, ...prev]);
      setAppointmentId(""); // Clear input for the next patient
      pushToast("Patient checked in and token generated!", "success");

    } catch (error) {
      console.error(error);
      pushToast("Failed to generate token. Check the Appointment ID.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2 max-w-6xl mx-auto">
      
      {/* --- KIOSK INPUT CARD --- */}
      <Card title="Patient Check-In">
        <p className="text-sm text-gray-500 mb-4">
          Enter the patient's Appointment ID to fetch their details and assign a queue token.
        </p>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                className="pl-9"
                placeholder="e.g. APT-B3A05C" 
                value={appointmentId} 
                onChange={(e) => setAppointmentId(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
            </div>
            <Button loading={loading} onClick={submit}>
              Generate Token
            </Button>
          </div>
        </div>
      </Card>

      {/* --- GENERATED TICKETS DISPLAY --- */}
      <Card title="Today's Issued Tokens">
        <div className="space-y-4">
          {tokens.map((token, idx) => (
            <div 
              key={idx} 
              className="relative overflow-hidden rounded-xl border border-[var(--teal)] bg-teal-50/20 p-5 shadow-sm transition-all hover:shadow-md"
            >
              {/* Ticket Header */}
              <div className="flex items-center justify-between border-b border-teal-100 pb-3 mb-3">
                <div className="flex items-center gap-2 text-[var(--teal)] font-black text-2xl tracking-tight">
                  <Ticket className="w-6 h-6" /> 
                  T-{String(token.token_number).padStart(3, '0')}
                </div>
                <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wide">
                  <Clock className="w-3.5 h-3.5"/> {token.status}
                </span>
              </div>
              
              {/* Ticket Details */}
              <div className="space-y-2 text-sm text-[var(--foreground)]">
                <p className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0"/> 
                  <span className="text-gray-500 w-20">Patient:</span> 
                  <span className="font-semibold">{token.patient_name}</span>
                </p>
                <p className="flex items-center gap-3">
                  <Stethoscope className="w-4 h-4 text-gray-400 flex-shrink-0"/> 
                  <span className="text-gray-500 w-20">Doctor ID:</span> 
                  <span className="font-medium">{token.doctor_id}</span>
                </p>
                <p className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-[var(--teal)] flex-shrink-0"/> 
                  <span className="text-gray-500 w-20">Appt ID:</span> 
                  <span className="font-medium">{token.appointment_id}</span>
                </p>
              </div>

              {/* Timestamp Footer */}
              <div className="mt-4 pt-3 border-t border-dashed border-teal-200">
                <p className="text-xs text-gray-400 font-mono text-center">
                  Issued: {token.generatedAt}
                </p>
              </div>
            </div>
          ))}
          
          {/* Empty State */}
          {!tokens.length && (
            <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <Ticket className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No tokens generated yet.</p>
              <p className="text-xs text-gray-400 mt-1">Scan or enter an Appointment ID to start.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}