"use client";

import { useState } from "react";
import { Ticket, User, Stethoscope, Clock, CheckCircle, Search, Printer, Calendar } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { formatDateTimeIST } from "@/lib/datetime";

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

  // --- PRINT HANDLER ---
  const handlePrint = (token: Record<string, any>) => {
    const formattedTokenNumber = `T-${String(token.token_number).padStart(3, '0')}`;
    
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      pushToast("Please allow pop-ups to print tokens", "error");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Token - ${formattedTokenNumber}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Inter', system-ui, sans-serif; 
              text-align: center; 
              padding: 20px; 
              color: #000;
            }
            .ticket-container {
              border: 2px dashed #000;
              padding: 30px 20px;
              width: 300px;
              margin: 0 auto;
              border-radius: 12px;
            }
            .hospital-name { font-size: 1.2rem; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
            .token-title { font-size: 0.9rem; color: #555; text-transform: uppercase; letter-spacing: 2px; margin-top: 20px; }
            .token-number { font-size: 4rem; font-weight: 900; margin: 10px 0; line-height: 1; }
            .details { text-align: left; margin-top: 30px; border-top: 1px solid #ccc; padding-top: 15px; font-size: 0.9rem; }
            .details p { margin: 8px 0; display: flex; justify-content: space-between; }
            .label { color: #555; }
            .value { font-weight: bold; text-align: right; max-width: 60%; word-break: break-word; }
            .footer { margin-top: 20px; font-size: 0.75rem; color: #777; border-top: 1px dashed #ccc; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="ticket-container">
            <div class="hospital-name">Dr. Decide Clinic</div>
            <div class="token-title">Queue Token</div>
            
            <div class="token-number">${formattedTokenNumber}</div>
            
            <div class="details">
              <p><span class="label">Patient:</span> <span class="value">${token.patient_name}</span></p>
              <p><span class="label">Appt ID:</span> <span class="value">${token.appointment_id}</span></p>
              <p><span class="label">Appt Time:</span> <span class="value">${token.appointment_time}</span></p>
              <p><span class="label">Doctor ID:</span> <span class="value">${token.doctor_name || token.doctor_id}</span></p>
            </div>
            
            <div class="footer">
              Issued on<br/>
              ${token.generatedAt}
            </div>
          </div>
          
          <script>
            window.onload = () => { 
              window.print(); 
              setTimeout(() => window.close(), 500); 
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  async function submit() {
    if (!appointmentId.trim()) {
      pushToast("Please enter an Appointment ID", "error");
      return;
    }

    setLoading(true);
    try {
      const aptDetails = await getAppointmentDetails(appointmentId);
      
      if (!aptDetails || !aptDetails.patient_id) {
        throw new Error("Invalid appointment data received");
      }

      const res = await hospitalCheckIn({ 
        patient_id: aptDetails.patient_id, 
        appointment_id: aptDetails.appointment_id 
      });

      await updateAppointmentStatus(aptDetails.appointment_id, "Waiting");

      const tokenRow = {
        token_number: res.token_number || res.token, 
        patient_name: aptDetails.full_name,
        doctor_id: aptDetails.doctor_id,
        doctor_name: aptDetails.doctor_name,
        // Format the ISO time string from the API into a readable format
        appointment_time: aptDetails.time ? formatDateTimeIST(aptDetails.time) : "N/A",
        appointment_id: aptDetails.appointment_id,
        status: "Waiting",
        generatedAt: formatDateTimeIST(new Date().toISOString()),
      };

      setTokens((prev) => [tokenRow, ...prev]);
      setAppointmentId(""); 
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
        <div className="space-y-4 m-4">
          {tokens.map((token, idx) => (
            <div 
              key={idx} 
              className="relative overflow-hidden rounded-xl border border-[var(--teal)] bg-teal-50/20 p-5 shadow-sm transition-all hover:shadow-md"
            >
              {/* Ticket Header */}
              <div className="flex items-center justify-between border-b border-teal-100 p-3 mb-3">
                <div className="flex items-center gap-2 text-[var(--teal)] font-black text-2xl tracking-tight">
                  <Ticket className="w-6 h-6" /> 
                  T-{String(token.token_number).padStart(3, '0')}
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wide">
                    <Clock className="w-3.5 h-3.5"/> {token.status}
                  </span>
                  
                  {/* PRINT BUTTON */}
                  <button 
                    onClick={() => handlePrint(token)}
                    className="p-1.5 bg-white border border-[var(--teal)] text-[var(--teal)] rounded-md hover:bg-[var(--teal)] hover:text-white transition-colors cursor-pointer"
                    title="Print Token"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Ticket Details */}
              <div className="space-y-2 text-sm text-[var(--foreground)]">
                <p className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0"/> 
                  <span className="text-gray-500 w-20">Patient:</span> 
                  <span className="font-semibold">{token.patient_name}</span>
                </p>
                <p className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-[var(--teal)] flex-shrink-0"/> 
                  <span className="text-gray-500 w-20">Appt ID:</span> 
                  <span className="font-medium">{token.appointment_id}</span>
                </p>
                <p className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0"/> 
                  <span className="text-gray-500 w-20">Appt Time:</span> 
                  <span className="font-medium">{token.appointment_time}</span>
                </p>
                <p className="flex items-center gap-3">
                  <Stethoscope className="w-4 h-4 text-gray-400 flex-shrink-0"/> 
                  <span className="text-gray-500 w-20">Doctor Name:</span> 
                  <span className="font-medium truncate" title={token.doctor_name || token.doctor_id}>
                    {token.doctor_name || token.doctor_id}
                  </span>
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
