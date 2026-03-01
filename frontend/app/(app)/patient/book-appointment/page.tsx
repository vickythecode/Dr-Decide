"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/context/ToastContext";
import { rememberDoctorName } from "@/lib/identity";
import { bookAppointment, patientDoctors } from "@/lib/services";
import { DoctorDirectoryItem } from "@/types";

const specialties = ["Cardiology", "General Medicine", "Neurology", "Orthopedics", "Dermatology"];

export default function PatientBookAppointmentPage() {
  const { pushToast } = useToast();
  const [specialty, setSpecialty] = useState("Cardiology");
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<DoctorDirectoryItem[]>([]);
  const [selected, setSelected] = useState<DoctorDirectoryItem | null>(null);
  const [appointmentDate, setAppointmentDate] = useState(
    () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  );
  const [reason, setReason] = useState("");

  async function onSearch() {
    setLoading(true);
    try {
      const res = await patientDoctors({ specialty });
      setDoctors(res.doctors || []);
      (res.doctors || []).forEach((doc) => {
        rememberDoctorName(String(doc.doctor_id || ""), String(doc.doctor_name || ""));
      });
      pushToast(`Found ${res.total_found} doctor(s)`, "success");
    } catch {
      pushToast("Failed to fetch doctors", "error");
    } finally {
      setLoading(false);
    }
  }

  async function onBook() {
    if (!selected) return;
    setLoading(true);
    try {
      await bookAppointment({
        patient_id: "self",
        doctor_id: selected.doctor_id,
        appointment_date: appointmentDate,
        reason,
      });
      pushToast("Appointment booked successfully", "success");
      setSelected(null);
    } catch {
      pushToast("Failed to book appointment", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card title="Book Appointment by Specialty">
        <div className="grid gap-2 md:grid-cols-[1fr_180px]">
          <select
            className="input"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          >
            {specialties.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <Button loading={loading} onClick={onSearch}>
            Search
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Specialty</th>
                <th>Clinic</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc) => (
                <tr key={doc.doctor_id}>
                  <td>{doc.doctor_name}</td>
                  <td>{doc.specialty}</td>
                  <td>{doc.clinic_name}</td>
                  <td>
                    <Button className="px-3 py-1 text-xs" onClick={() => setSelected(doc)}>
                      Book
                    </Button>
                  </td>
                </tr>
              ))}
              {!doctors.length && (
                <tr>
                  <td colSpan={4} className="muted text-center">
                    Select a specialty and search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!selected} title={`Book with ${selected?.doctor_name || ""}`} onClose={() => setSelected(null)}>
        <div className="space-y-2">
          <Input
            value={appointmentDate}
            onChange={(e) => setAppointmentDate(e.target.value)}
            placeholder="YYYY-MM-DDTHH:mm:ssZ"
          />
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for appointment" />
          <Button loading={loading} onClick={onBook} className="w-full">
            Confirm Booking
          </Button>
        </div>
      </Modal>
    </>
  );
}
