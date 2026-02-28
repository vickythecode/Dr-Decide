"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { hospitalCheckIn } from "@/lib/services";

export default function HospitalKioskPage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [appointmentId, setAppointmentId] = useState("APT-123456");
  const [tokenData, setTokenData] = useState<Record<string, unknown> | null>(null);

  async function submit() {
    setLoading(true);
    try {
      const res = await hospitalCheckIn({ patient_id: patientId, appointment_id: appointmentId });
      setTokenData(res as Record<string, unknown>);
      pushToast("Check-in complete", "success");
    } catch {
      pushToast("Check-in failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Hospital Kiosk Check-In">
      <div className="space-y-3">
        <Input placeholder="Patient ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
        <Input placeholder="Appointment ID" value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} />
        <Button loading={loading} onClick={submit}>Generate Queue Token</Button>
        {tokenData && (
          <pre className="log mt-2">{JSON.stringify(tokenData, null, 2)}</pre>
        )}
      </div>
    </Card>
  );
}
