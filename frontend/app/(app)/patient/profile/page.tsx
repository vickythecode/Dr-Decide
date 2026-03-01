"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { getAuthSubject, rememberPatientName } from "@/lib/identity";
import { patientSetupProfile } from "@/lib/services";

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
  const [gender, setGender] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("patient_profile_gender") || "";
  });
  const [phoneNumber, setPhoneNumber] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("patient_profile_phoneNumber") || "";
  });
  const [emergencyContact, setEmergencyContact] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("patient_profile_emergencyContact") || "";
  });
  const [knownAllergies, setKnownAllergies] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("patient_profile_knownAllergies") || "";
  });
  const [city, setCity] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("patient_profile_city") || "";
  });
  const [state, setState] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("patient_profile_state") || "";
  });
  const [pincode, setPincode] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("patient_profile_pincode") || "";
  });
  const [loading, setLoading] = useState(false);

  async function save() {
    const parsedAge = Number(age);
    if (
      !fullName.trim() ||
      !Number.isFinite(parsedAge) ||
      parsedAge <= 0 ||
      !gender.trim() ||
      !phoneNumber.trim() ||
      !city.trim() ||
      !state.trim() ||
      !pincode.trim()
    ) {
      pushToast("Please fill all required profile fields", "error");
      return;
    }

    setLoading(true);
    try {
      await patientSetupProfile({
        full_name: fullName.trim(),
        age: parsedAge,
        gender: gender.trim(),
        phone_number: phoneNumber.trim(),
        blood_group: bloodGroup.trim() || "Unknown",
        emergency_contact: emergencyContact.trim() || undefined,
        known_allergies: knownAllergies.trim() || "None",
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
      });

      if (typeof window !== "undefined") {
        window.localStorage.setItem("patient_profile_fullName", fullName);
        window.localStorage.setItem("patient_profile_age", age);
        window.localStorage.setItem("patient_profile_gender", gender);
        window.localStorage.setItem("patient_profile_phoneNumber", phoneNumber);
        window.localStorage.setItem("patient_profile_bloodGroup", bloodGroup);
        window.localStorage.setItem("patient_profile_emergencyContact", emergencyContact);
        window.localStorage.setItem("patient_profile_knownAllergies", knownAllergies);
        window.localStorage.setItem("patient_profile_city", city);
        window.localStorage.setItem("patient_profile_state", state);
        window.localStorage.setItem("patient_profile_pincode", pincode);
        const subject = getAuthSubject();
        if (subject) rememberPatientName(subject, fullName);
      }
      pushToast("Profile setup complete", "success");
    } catch {
      pushToast("Failed to setup profile", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Patient Profile">
      <div className="space-y-3">
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
        <Input type="number" min={1} value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" />
        <Input value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Gender" />
        <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone number" />
        <Input value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} placeholder="Blood group" />
        <Input
          value={emergencyContact}
          onChange={(e) => setEmergencyContact(e.target.value)}
          placeholder="Emergency contact"
        />
        <Input
          value={knownAllergies}
          onChange={(e) => setKnownAllergies(e.target.value)}
          placeholder="Known allergies"
        />
        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
        <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
        <Input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="Pincode" />
        <Button loading={loading} onClick={save}>Save Profile</Button>
      </div>
    </Card>
  );
}
