"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { getAuthSubject, rememberDoctorName } from "@/lib/identity";
import { doctorSetupProfile } from "@/lib/services"; // Assume you added getDoctorProfile to services.ts
import { api } from "@/lib/api"; // importing api to fetch the profile
import { useRouter } from "next/navigation";

const SPECIALTY_OPTIONS = [
  "General Physician",
  "Cardiologist",
  "Dermatologist",
  "Neurologist",
  "Orthopedist",
  "Pediatrician",
  "Psychiatrist",
  "Gynecologist",
  "Oncologist"
];

export default function DoctorProfilePage() {
  const { pushToast } = useToast();
  const router = useRouter();
  
  // Basic States - We start with empty strings and wait for the API
  const [doctorName, setDoctorName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [clinicName, setClinicName] = useState("");
  
  // Location States
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // --- NEW: Load Existing Profile on Mount ---
  useEffect(() => {
    async function loadProfile() {
      try {
        // Hit your GET /api/doctor/profile endpoint
        const { data } = await api.get("/api/doctor/profile");
        
        // If data exists, populate the form
        if (data && data.profile_status === "Complete") {
          setDoctorName(data.doctor_name || "");
          setSpecialty(data.specialty || "");
          setClinicName(data.clinic_name || "");
          setPincode(data.pincode || "");
          setCity(data.city || "");
          setState(data.state || "");
        }
      } catch (error: any) {
        // It's normal if this fails on a brand new account (e.g., 404 Not Found)
        console.log("No existing profile found or error fetching:", error);
      } finally {
        setIsInitializing(false);
      }
    }

    loadProfile();
  }, []);

  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... (Your existing pincode logic remains exactly the same)
    const value = e.target.value;
    if (!/^\d*$/.test(value) || value.length > 6) return;
    setPincode(value);
    
    if (value.length === 6) {
      setIsFetchingLocation(true);
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${value}`);
        const data = await response.json();
        if (data && data[0] && data[0].Status === "Success") {
          const postOffice = data[0].PostOffice[0];
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
      setCity("");
      setState("");
    }
  };

  async function submit() {
    // ... (Your existing submit logic remains exactly the same)
    if (!doctorName.trim() || !specialty.trim() || !clinicName.trim() || !city.trim() || !state.trim() || !pincode.trim() || pincode.length !== 6) {
      pushToast("Please fill all required profile fields correctly", "error");
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
        const subject = getAuthSubject();
        if (subject) rememberDoctorName(subject, doctorName);
      }
      pushToast("Profile saved successfully", "success");
      router.push("/doctor/dashboard");
    } catch {
      pushToast("Failed to setup profile", "error");
    } finally {
      setLoading(false);
    }
  }

  const selectClassName = "flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm ring-offset-[var(--background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  // Prevent flashing an empty form before the API responds
  if (isInitializing) {
    return (
      <Card title="Doctor Profile Setup">
        <div className="flex justify-center p-8 animate-pulse text-sm text-gray-500">
          Loading profile data...
        </div>
      </Card>
    );
  }

  return (
    <Card title="Doctor Profile Setup">
       {/* ... (Your existing JSX remains exactly the same) ... */}
      <div className="space-y-4">
        
        <div className="space-y-3">
          <Input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder="Full Name (e.g. Dr. John Doe)" />
          
          <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className={selectClassName}>
            <option value="" disabled>Select Specialty</option>
            {SPECIALTY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <Input value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="Clinic / Hospital Name" />
        </div>

        <div className="pt-4 border-t border-[var(--border)] space-y-3">
          <div>
            <label className="text-sm font-semibold block">Clinic Location</label>
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
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" disabled className="bg-[var(--muted)]/20 cursor-not-allowed" />
            <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" disabled className="bg-[var(--muted)]/20 cursor-not-allowed" />
          </div>
        </div>

        <Button loading={loading} onClick={submit} className="w-full mt-2">
          Save Profile
        </Button>
      </div>
    </Card>
  );
}