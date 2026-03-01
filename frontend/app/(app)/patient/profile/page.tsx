"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { getAuthSubject, rememberPatientName } from "@/lib/identity";

export default function PatientProfilePage() {
  const { pushToast } = useToast();
  const [fullName, setFullName] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("patient_profile_fullName") || "";
  });
  const [age, setAge] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("patient_profile_age") || "";
  });
  const [bloodGroup, setBloodGroup] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("patient_profile_bloodGroup") || "";
  });
  const [emergencyContact, setEmergencyContact] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("patient_profile_emergencyContact") || "";
  });
  const [loading, setLoading] = useState(false);

  function save() {
    setLoading(true);
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("patient_profile_fullName", fullName);
        window.localStorage.setItem("patient_profile_age", age);
        window.localStorage.setItem("patient_profile_bloodGroup", bloodGroup);
        window.localStorage.setItem("patient_profile_emergencyContact", emergencyContact);
        const subject = getAuthSubject();
        if (subject) rememberPatientName(subject, fullName);
      }
      setLoading(false);
      pushToast("Profile updated locally", "success");
    }, 500);
  }

  return (
    <Card title="Patient Profile">
      <div className="space-y-3">
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
        <Input value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" />
        <Input value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} placeholder="Blood group" />
        <Input
          value={emergencyContact}
          onChange={(e) => setEmergencyContact(e.target.value)}
          placeholder="Emergency contact"
        />
        <Button loading={loading} onClick={save}>Save Profile</Button>
      </div>
    </Card>
  );
}
