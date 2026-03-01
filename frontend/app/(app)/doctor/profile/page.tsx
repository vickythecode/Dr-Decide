"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { getAuthSubject, rememberDoctorName } from "@/lib/identity";
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
  const [city, setCity] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("doctor_profile_city") || "";
  });
  const [state, setState] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("doctor_profile_state") || "";
  });
  const [pincode, setPincode] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("doctor_profile_pincode") || "";
  });

  async function submit() {
    if (!doctorName.trim() || !specialty.trim() || !clinicName.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      pushToast("Please fill all required profile fields", "error");
      return;
    }
    setLoading(true);
    try {
      await doctorSetupProfile({
        doctor_name: doctorName.trim(),
        specialty: specialty.trim(),
        clinic_name: clinicName.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
      });
      if (typeof window !== "undefined") {
        window.localStorage.setItem("doctor_profile_doctorName", doctorName);
        window.localStorage.setItem("doctor_profile_specialty", specialty);
        window.localStorage.setItem("doctor_profile_clinicName", clinicName);
        window.localStorage.setItem("doctor_profile_city", city);
        window.localStorage.setItem("doctor_profile_state", state);
        window.localStorage.setItem("doctor_profile_pincode", pincode);
        const subject = getAuthSubject();
        if (subject) rememberDoctorName(subject, doctorName);
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
        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
        <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
        <Input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="Pincode" />
        <Button loading={loading} onClick={submit}>Save Profile</Button>
      </div>
    </Card>
  );
}
