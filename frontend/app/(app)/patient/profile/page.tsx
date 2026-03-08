"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { getAuthSubject, rememberPatientName } from "@/lib/identity";
import { api } from "@/lib/api";
import { patientSetupProfile } from "@/lib/services";
import { useRouter } from "next/navigation";

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];

export default function PatientProfilePage() {
  const { pushToast } = useToast();
  const router = useRouter();

  // Basic States
  const [fullName, setFullName] = useState(() => typeof window !== "undefined" ? window.localStorage.getItem("patient_profile_fullName") || "" : "");
  const [age, setAge] = useState(() => typeof window !== "undefined" ? window.localStorage.getItem("patient_profile_age") || "" : "");
  const [gender, setGender] = useState(() => typeof window !== "undefined" ? window.localStorage.getItem("patient_profile_gender") || "" : "");
  const [bloodGroup, setBloodGroup] = useState(() => typeof window !== "undefined" ? window.localStorage.getItem("patient_profile_bloodGroup") || "" : "");
  const [phoneNumber, setPhoneNumber] = useState(() => typeof window !== "undefined" ? window.localStorage.getItem("patient_profile_phoneNumber") || "" : "");
  const [emergencyContact, setEmergencyContact] = useState(() => typeof window !== "undefined" ? window.localStorage.getItem("patient_profile_emergencyContact") || "" : "");
  const [knownAllergies, setKnownAllergies] = useState(() => typeof window !== "undefined" ? window.localStorage.getItem("patient_profile_knownAllergies") || "" : "");

  // Location States
  const [pincode, setPincode] = useState(() => typeof window !== "undefined" ? window.localStorage.getItem("patient_profile_pincode") || "" : "");
  const [city, setCity] = useState(() => typeof window !== "undefined" ? window.localStorage.getItem("patient_profile_city") || "" : "");
  const [state, setState] = useState(() => typeof window !== "undefined" ? window.localStorage.getItem("patient_profile_state") || "" : "");

  const [loading, setLoading] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data } = await api.get("/api/patient/profile");
        if (data && data.profile_status === "Complete") {
          const resolvedPincode = data.pincode ?? data.pin_code ?? data.postal_code ?? "";
          const normalizedPincode = String(resolvedPincode).trim();

          setFullName((prev) => data.full_name || prev);
          setAge((prev) => (data.age != null ? String(data.age) : prev));
          setGender((prev) => data.gender || prev);
          setBloodGroup((prev) => data.blood_group || prev);
          setPhoneNumber((prev) => data.phone_number || prev);
          setEmergencyContact((prev) => data.emergency_contact || prev);
          setKnownAllergies((prev) => data.known_allergies || prev);
          setCity((prev) => data.city || prev);
          setState((prev) => data.state || prev);
          setPincode((prev) => normalizedPincode || prev);

          if (typeof window !== "undefined") {
            if (data.full_name) window.localStorage.setItem("patient_profile_fullName", data.full_name);
            if (data.age != null) window.localStorage.setItem("patient_profile_age", String(data.age));
            if (data.gender) window.localStorage.setItem("patient_profile_gender", data.gender);
            if (data.phone_number) window.localStorage.setItem("patient_profile_phoneNumber", data.phone_number);
            if (data.blood_group) window.localStorage.setItem("patient_profile_bloodGroup", data.blood_group);
            if (data.emergency_contact) window.localStorage.setItem("patient_profile_emergencyContact", data.emergency_contact);
            if (data.known_allergies) window.localStorage.setItem("patient_profile_knownAllergies", data.known_allergies);
            if (data.city) window.localStorage.setItem("patient_profile_city", data.city);
            if (data.state) window.localStorage.setItem("patient_profile_state", data.state);
            if (normalizedPincode) window.localStorage.setItem("patient_profile_pincode", normalizedPincode);
          }
        }
      } catch (error) {
        console.log("No existing patient profile found or error fetching:", error);
      } finally {
        setIsInitializing(false);
      }
    }

    loadProfile();
  }, []);

  // --- THE MAGIC PINCODE API CALL ---
  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Only allow numbers, max 6 digits
    if (!/^\d*$/.test(value) || value.length > 6) return;

    setPincode(value);

    // Trigger API exact match at 6 digits
    if (value.length === 6) {
      setIsFetchingLocation(true);
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${value}`);
        const data = await response.json();

        if (data && data[0] && data[0].Status === "Success") {
          const postOffice = data[0].PostOffice[0];
          // District is usually better for City/Region mapping in India
          setCity(postOffice.District);
          setState(postOffice.State);
          pushToast("Location auto-filled!", "success");
        } else {
          setCity("");
          setState("");
          pushToast("Invalid Pincode. Please check again.", "error");
        }
      } catch (error) {
        console.error(error);
        pushToast("Network error fetching location.", "error");
      } finally {
        setIsFetchingLocation(false);
      }
    } else {
      // Clear city and state if they delete digits making it less than 6
      setCity("");
      setState("");
    }
  };

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
      !pincode.trim() ||
      pincode.length !== 6
    ) {
      pushToast("Please fill all required profile fields correctly", "error");
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
      router.push("/patient/dashboard");
    } catch {
      pushToast("Failed to setup profile", "error");
    } finally {
      setLoading(false);
    }
  }

  // Helper class for the dropdown to match your Input component's styling
  const selectClassName = "flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm ring-offset-[var(--background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  if (isInitializing) {
    return (
      <Card title="Patient Profile">
        <div className="flex justify-center p-8 animate-pulse text-sm text-gray-500">
          Loading profile data...
        </div>
      </Card>
    );
  }

  return (
    <Card title="Patient Profile">
      <div className="space-y-4">

        {/* Basic Details Section */}
        <div className="space-y-3">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" />

          <div className="grid grid-cols-2 gap-3">
            <Input type="number" min={1} value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" />

            <select value={gender} onChange={(e) => setGender(e.target.value)} className={selectClassName}>
              <option value="" disabled>Select Gender</option>
              {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone Number" />
        </div>

        {/* Medical Details Section */}
        <div className="pt-4 border-t border-[var(--border)] space-y-3">
          <label className="text-sm font-semibold block">Medical Details</label>
          <Input value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} placeholder="Blood Group (e.g. O+)" />
          <Input value={knownAllergies} onChange={(e) => setKnownAllergies(e.target.value)} placeholder="Known Allergies (or 'None')" />
          <Input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="Emergency Contact Number" />
        </div>

        {/* Smart Location Section */}
        <div className="pt-4 border-t border-[var(--border)] space-y-3">
          <div>
            <label className="text-sm font-semibold block">Location</label>
            <p className="text-xs text-[var(--muted)] mb-2">Enter your 6-digit Pincode to auto-fill your city and state.</p>
          </div>

          <div className="relative">
            <Input
              value={pincode}
              onChange={handlePincodeChange}
              placeholder="6-Digit Pincode"
              maxLength={6}
            />
            {isFetchingLocation && (
              <span className="absolute right-3 top-2.5 text-xs font-semibold text-[var(--teal)] animate-pulse">
                Searching...
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              disabled // Locks the input to ensure perfectly formatted backend data
              className="bg-[var(--muted)]/20 cursor-not-allowed"
            />
            <Input
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="State"
              disabled
              className="bg-[var(--muted)]/20 cursor-not-allowed"
            />
          </div>
        </div>

        <Button loading={loading} onClick={save} className="w-full mt-2">
          Save Profile
        </Button>
      </div>
    </Card>
  );
}
