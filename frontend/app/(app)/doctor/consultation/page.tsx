"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { doctorConsultation } from "@/lib/services";

function DoctorConsultationForm() {
  const searchParams = useSearchParams();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    patient_id: "",
    appointment_id: "",
    phone_number: "",
    medical_history: "",
    current_examination: "",
    medicines_prescribed: "",
    follow_up_details: "",
  });

  useEffect(() => {
    const patientId = searchParams.get("patient_id") || "";
    const appointmentId = searchParams.get("appointment_id") || "";
    if (!patientId && !appointmentId) return;
    setForm((prev) => ({
      ...prev,
      patient_id: patientId || prev.patient_id,
      appointment_id: appointmentId || prev.appointment_id,
    }));
  }, [searchParams]);

  async function submit() {
    setLoading(true);
    try {
      await doctorConsultation(form);
      pushToast("Consultation submitted successfully", "success");
    } catch {
      pushToast("Failed to submit consultation", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Submit Consultation">
      <div className="space-y-3">
        <Input
          value={form.patient_id}
          onChange={(e) => setForm((prev) => ({ ...prev, patient_id: e.target.value }))}
          placeholder="Patient ID"
        />
        <Input
          value={form.appointment_id}
          onChange={(e) => setForm((prev) => ({ ...prev, appointment_id: e.target.value }))}
          placeholder="Appointment ID"
        />
        <Input
          value={form.phone_number}
          onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))}
          placeholder="Phone Number"
        />
        <textarea
          className="input min-h-24"
          value={form.medical_history}
          onChange={(e) => setForm((prev) => ({ ...prev, medical_history: e.target.value }))}
          placeholder="Medical history"
        />
        <textarea
          className="input min-h-24"
          value={form.current_examination}
          onChange={(e) => setForm((prev) => ({ ...prev, current_examination: e.target.value }))}
          placeholder="Current examination"
        />
        <textarea
          className="input min-h-24"
          value={form.medicines_prescribed}
          onChange={(e) => setForm((prev) => ({ ...prev, medicines_prescribed: e.target.value }))}
          placeholder="Medicines prescribed"
        />
        <textarea
          className="input min-h-24"
          value={form.follow_up_details}
          onChange={(e) => setForm((prev) => ({ ...prev, follow_up_details: e.target.value }))}
          placeholder="Follow up details"
        />
        <Button loading={loading} onClick={submit}>Submit Consultation</Button>
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
