"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { firstPresent, formatNameWithId } from "@/lib/display";
import { resolvePatientName } from "@/lib/identity";
import { hospitalCheckIn } from "@/lib/services";
import { formatDateTimeIST } from "@/lib/datetime";

export default function ReceptionistGenerateTokenPage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [serviceType, setServiceType] = useState("General Consultation");
  const [priority, setPriority] = useState("Normal");
  const [tokens, setTokens] = useState<Array<Record<string, unknown>>>([]);

  async function submit() {
    setLoading(true);
    try {
      const res = await hospitalCheckIn({ patient_id: patientId, appointment_id: appointmentId });
      const tokenRow = {
        ...res,
        serviceType,
        priority,
        generatedAt: formatDateTimeIST(new Date().toISOString()),
      };
      setTokens((prev) => [tokenRow as Record<string, unknown>, ...prev]);
      pushToast("Walk-in token generated", "success");
    } catch {
      pushToast("Unable to generate token", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Generate Walk-In Token">
        <div className="space-y-2">
          <Input placeholder="Patient Name / ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
          <Input placeholder="Appointment ID" value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} />
          <select className="input" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
            <option>General Consultation</option>
            <option>Insurance Verification</option>
            <option>Follow-Up Review</option>
            <option>Emergency Review</option>
          </select>
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option>Normal</option>
            <option>High</option>
            <option>Critical</option>
          </select>
          <Button loading={loading} onClick={submit}>Generate Token</Button>
        </div>
      </Card>

      <Card title="Generated Tokens">
        <div className="space-y-2">
          {tokens.map((token, idx) => (
            <div key={idx} className="rounded-lg border border-[var(--border)] bg-[#f6fbfc] p-3 text-sm">
              <p>Token: {String(token.token_number || "-")}</p>
              <p>
                Patient:{" "}
                {formatNameWithId(
                  firstPresent(token, ["patient_name", "patient_full_name", "full_name", "name"]) ||
                    resolvePatientName(String(token.patient_id || patientId || "")),
                  token.patient_id || patientId,
                  "-"
                )}
              </p>
              <p>Service: {String(token.serviceType || "-")} ({String(token.priority || "-")})</p>
              <p className="muted mt-1 text-xs">{String(token.generatedAt || "-")}</p>
            </div>
          ))}
          {!tokens.length && <p className="muted text-sm">No tokens generated yet.</p>}
        </div>
      </Card>
    </div>
  );
}
