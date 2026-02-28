"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { doctorSetupProfile } from "@/lib/services";

export default function DoctorProfilePage() {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [doctorName, setDoctorName] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("doctor_profile_doctorName") || "";
  });
  const [specialty, setSpecialty] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("doctor_profile_specialty") || "";
  });
  const [clinicName, setClinicName] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("doctor_profile_clinicName") || "";
  });

  async function submit() {
    setLoading(true);
    try {
      await doctorSetupProfile({ doctor_name: doctorName, specialty, clinic_name: clinicName });
      if (typeof window !== "undefined") {
        window.localStorage.setItem("doctor_profile_doctorName", doctorName);
        window.localStorage.setItem("doctor_profile_specialty", specialty);
        window.localStorage.setItem("doctor_profile_clinicName", clinicName);
      }
      pushToast("Profile setup complete", "success");
    } catch {
      pushToast("Failed to setup profile", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Doctor Profile Setup">
      <div className="space-y-3">
        <Input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder="Doctor name" />
        <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Specialty" />
        <Input value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="Clinic name" />
        <Button loading={loading} onClick={submit}>Save Profile</Button>
      </div>
    </Card>
  );
}
