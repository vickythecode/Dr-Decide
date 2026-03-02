"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
// 1. IMPORT the update status service!
import { doctorConsultation, updateAppointmentStatus } from "@/lib/services";

function DoctorConsultationForm() {
  const searchParams = useSearchParams();
  const router = useRouter(); // Added router for redirection
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [patientLabel, setPatientLabel] = useState("");
  
  const [form, setForm] = useState({
    patient_id: "",
    patient_name: "", 
    appointment_id: "",
    phone_number: "",
    medical_history: "",
    current_examination: "",
    medicines_prescribed: "",
    follow_up_details: "",
  });

  useEffect(() => {
    const patientId = searchParams.get("patient_id") || "";
    const patientName = searchParams.get("patient_name") || "";
    const appointmentId = searchParams.get("appointment_id") || "";
    
    if (!patientId && !appointmentId) return;
    
    // Cleaned up the label to only show the name
    setPatientLabel(patientName || "Unknown Patient");
    
    setForm((prev) => ({
      ...prev,
      patient_id: patientId || prev.patient_id,
      appointment_id: appointmentId || prev.appointment_id,
      patient_name: patientName || prev.patient_name,
    }));
  }, [searchParams]);

  async function submit() {
    setLoading(true);
    try {
      const { patient_name, ...apiPayload } = form;
      
      // 1. Submit the consultation details
      await doctorConsultation(apiPayload);
      
      // 2. Mark the appointment as Completed!
      await updateAppointmentStatus(apiPayload.appointment_id, "Completed");
      
      pushToast("Consultation submitted successfully!", "success");
      
      // 3. Optional but recommended: Send the doctor back to their dashboard after a success
      router.push("/doctor/dashboard");
      
    } catch {
      pushToast("Failed to submit consultation", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Submit Consultation">
      <div className="space-y-3">
        {patientLabel && <p className="text-sm font-semibold text-[var(--teal)]">Consulting: {patientLabel}</p>}
        
        <Input
          value={form.patient_name}
          disabled
          placeholder="Patient Name"
        />
        
        <Input
          value={form.appointment_id}
          disabled
          placeholder="Appointment ID"
        />
        
        <Input
          value={form.phone_number}
          onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))}
          placeholder="Patient Phone Number (For SMS Alert)"
        />
        
        <textarea
          className="flex min-h-[100px] w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]"
          value={form.medical_history}
          onChange={(e) => setForm((prev) => ({ ...prev, medical_history: e.target.value }))}
          placeholder="Medical history"
        />
        
        <textarea
           className="flex min-h-[100px] w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]"
          value={form.current_examination}
          onChange={(e) => setForm((prev) => ({ ...prev, current_examination: e.target.value }))}
          placeholder="Current examination (Type fast, AI will translate!)"
        />
        
        <textarea
           className="flex min-h-[100px] w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]"
          value={form.medicines_prescribed}
          onChange={(e) => setForm((prev) => ({ ...prev, medicines_prescribed: e.target.value }))}
          placeholder="Medicines prescribed"
        />
        
        <textarea
           className="flex min-h-[100px] w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]"
          value={form.follow_up_details}
          onChange={(e) => setForm((prev) => ({ ...prev, follow_up_details: e.target.value }))}
          placeholder="Follow up details"
        />
        
        <Button loading={loading} onClick={submit} className="w-full mt-2">Generate AI Care Plan & Complete</Button>
      </div>
    </Card>
  );
}

export default function DoctorConsultationPage() {
  return (
    <Suspense fallback={<Card title="Submit Consultation"><p className="muted text-sm">Loading consultation form...</p></Card>}>
      <DoctorConsultationForm />
    </Suspense>
  );
}