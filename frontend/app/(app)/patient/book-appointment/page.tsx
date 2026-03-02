"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";
import { getAuthSubject,rememberDoctorName } from "@/lib/identity";
import { bookAppointment, patientDoctors } from "@/lib/services";
import { DoctorDirectoryItem } from "@/types";
// 1. FIXED: These now perfectly match the DoctorProfilePage so search works!
const SPECIALTIES = [
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

// Helper to get tomorrow's date formatted for the datetime-local input
const getTomorrowFormatted = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  // Adjust for local timezone so the input displays correctly
  tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
  return tomorrow.toISOString().slice(0, 16); // Returns "YYYY-MM-DDTHH:mm"
};

export default function PatientBookAppointmentPage() {
  const { pushToast } = useToast();
  const [specialty, setSpecialty] = useState(SPECIALTIES[0]);
  const [pincode, setPincode] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("patient_profile_pincode") || "";
  });
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<DoctorDirectoryItem[]>([]);
  const [selected, setSelected] = useState<DoctorDirectoryItem | null>(null);
  
  // 2. FIXED: Defaulting to a clean local datetime format
  const [appointmentDate, setAppointmentDate] = useState(getTomorrowFormatted());
  const [reason, setReason] = useState("");

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*$/.test(val) && val.length <= 6) {
      setPincode(val);
    }
  };

  async function onSearch() {
    setLoading(true);
    try {
      const cleanPincode = pincode.trim();
      const res = await patientDoctors({ specialty, pincode: cleanPincode || undefined });
      
      const foundDoctors = res.doctors || [];
      setDoctors(foundDoctors);
      
      foundDoctors.forEach((doc: DoctorDirectoryItem) => {
        rememberDoctorName(String(doc.doctor_id || ""), String(doc.doctor_name || ""));
      });
      
      const count = Number(res.total_found ?? res.results_found ?? foundDoctors.length);
      pushToast(`Found ${count} doctor(s)`, "success");
    } catch {
      pushToast("Failed to fetch doctors", "error");
    } finally {
      setLoading(false);
    }
  }

 async function onBook() {
    if (!selected) return;
    if (!appointmentDate || !reason.trim()) {
      pushToast("Please provide a date and reason", "error");
      return;
    }

    // 1. Get the real Patient ID from the current session
    const patientId = getAuthSubject();
   
    // 2. Safety check: Ensure they haven't been logged out
    if (!patientId) {
      pushToast("Session expired. Please log in again.", "error");
      return;

    }else{
      pushToast("Patient ID found: " + patientId, "success");
    }

    setLoading(true);
    try {
      await bookAppointment({
        patient_id: patientId, 

        doctor_id: selected.doctor_id,
        appointment_date: new Date(appointmentDate).toISOString(),
        reason: reason.trim(),
      });
      pushToast("Appointment booked successfully!", "success");
      
      // Close modal and reset form
      setSelected(null);
      setReason("");
      setAppointmentDate(getTomorrowFormatted());
    } catch {
      pushToast("Failed to book appointment", "error");
    } finally {
      setLoading(false);
    }
  }

  // Consistent Dropdown Styling
  const selectClassName = "flex h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <>
      <Card title="Find & Book a Doctor">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_140px] mb-4">
          <select
            className={selectClassName}
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          >
            {SPECIALTIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          
          <Input
            value={pincode}
            onChange={handlePincodeChange}
            placeholder="Pincode (Optional)"
            maxLength={6}
          />
          
          <Button loading={loading && !selected} onClick={onSearch}>
            Search
          </Button>
        </div>

        <div className="overflow-x-auto border border-[var(--border)] rounded-md">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[var(--muted)]/10 border-b border-[var(--border)]">
              <tr>
                <th className="p-3 text-sm font-semibold">Doctor</th>
                <th className="p-3 text-sm font-semibold">Specialty</th>
                <th className="p-3 text-sm font-semibold">Clinic</th>
                <th className="p-3 text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc) => (
                <tr key={doc.doctor_id} className="border-b border-[var(--border)] last:border-0 hover:bg-gray-50/50">
                  <td className="p-3 font-medium">{doc.doctor_name}</td>
                  <td className="p-3 text-[var(--muted)]">{doc.specialty}</td>
                  <td className="p-3 text-[var(--muted)]">{doc.clinic_name}</td>
                  <td className="p-3">
                    <Button className="px-3 py-1 text-xs" onClick={() => setSelected(doc)}>
                      Book
                    </Button>
                  </td>
                </tr>
              ))}
              {!doctors.length && (
                <tr>
                  <td colSpan={4} className="p-6 text-sm text-center text-[var(--muted)]">
                    Select a specialty and search to find available doctors.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Booking Modal */}
      <Modal open={!!selected} title={`Book with ${selected?.doctor_name || "Doctor"}`} onClose={() => setSelected(null)}>
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-sm font-semibold mb-1">Appointment Date & Time</label>
            <Input
              type="datetime-local"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              // Prevent booking in the past
              min={new Date().toISOString().slice(0, 16)} 
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-1">Reason for Visit</label>
            <Input 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
              placeholder="e.g., Routine checkup, mild fever" 
            />
          </div>
          
          <div className="pt-2">
            <Button loading={loading} onClick={onBook} className="w-full">
              Confirm Booking
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}