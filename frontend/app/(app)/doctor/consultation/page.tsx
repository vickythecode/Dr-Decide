"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { UploadCloud, FileText, X } from "lucide-react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { doctorConsultation, updateAppointmentStatus } from "@/lib/services";

function DoctorConsultationForm() {
  const searchParams = useSearchParams();
  const router = useRouter(); 
  const { pushToast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [patientLabel, setPatientLabel] = useState("");
  
  // File upload & drag-and-drop state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Form text fields state
  const [form, setForm] = useState({
    patient_id: "",
    patient_name: "", 
    appointment_id: "",
    phone_number: "",
    medical_history_text: "", 
    current_examination: "",
    medicines_prescribed: "",
    follow_up_details: "",
  });

  // Pull details from the URL parameters
  useEffect(() => {
    const patientId = searchParams.get("patient_id") || "";
    const patientName = searchParams.get("patient_name") || "";
    const appointmentId = searchParams.get("appointment_id") || "";
    
    if (!patientId && !appointmentId) return;
    
    setPatientLabel(patientName || "Unknown Patient");
    
    setForm((prev) => ({
      ...prev,
      patient_id: patientId || prev.patient_id,
      appointment_id: appointmentId || prev.appointment_id,
      patient_name: patientName || prev.patient_name,
    }));
  }, [searchParams]);

  // --- CORRECTED DRAG AND DROP HANDLERS WITH PROPER TYPES ---
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); 
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  // --- SUBMISSION HANDLER ---
  async function submit() {
    setLoading(true);
    try {
      // 1. Build the FormData object to support both text and files
      const formData = new FormData();
      formData.append("patient_id", form.patient_id);
      formData.append("appointment_id", form.appointment_id);
      formData.append("current_examination", form.current_examination);
      formData.append("medicines_prescribed", form.medicines_prescribed);
      formData.append("follow_up_details", form.follow_up_details);
      
      if (form.phone_number) formData.append("phone_number", form.phone_number);
      if (form.medical_history_text) formData.append("medical_history_text", form.medical_history_text);

      if (file) {
        formData.append("file", file);
      }

      // 2. Submit the consultation using FormData
      await doctorConsultation(formData);
      
      // 3. Mark the appointment as Completed
      await updateAppointmentStatus(form.appointment_id, "Completed");
      
      pushToast("Consultation submitted successfully!", "success");
      router.push("/doctor/dashboard");
      
    } catch (error) {
      console.error(error);
      pushToast("Failed to submit consultation", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Submit Consultation">
      <div className="space-y-4">
        {patientLabel && (
          <p className="text-sm font-semibold text-[var(--teal)]">
            Consulting: {patientLabel}
          </p>
        )}
        
        <div className="grid grid-cols-2 gap-3">
          <Input value={form.patient_name} disabled placeholder="Patient Name" />
          <Input value={form.appointment_id} disabled placeholder="Appointment ID" />
        </div>
        
        <Input
          value={form.phone_number}
          onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))}
          placeholder="Patient Phone Number (For SMS Alert)"
        />

        {/* --- INTERACTIVE FILE UPLOAD UI --- */}
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]">
            Attach Medical Record (Optional PDF/Image)
          </label>

          {!file ? (
            <label 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer group ${
                isDragging 
                  ? "border-[var(--teal)] bg-teal-50/30 scale-[1.02]" 
                  : "border-gray-300 bg-[var(--background)] hover:bg-gray-50 hover:border-gray-400" 
              }`}
            >
              <UploadCloud 
                className={`w-8 h-8 mb-3 transition-colors ${
                  isDragging ? "text-[var(--teal)] animate-bounce" : "text-gray-400 group-hover:text-gray-500"
                }`} 
              />
              <span className="text-sm text-gray-600 transition-colors border-4 border-dashed border-transparent group-hover:border-gray-400">
                <span className="font-semibold text-[var(--teal)]">Click to upload</span> or drag and drop here
              </span>
              <span className="text-xs text-gray-400 mt-1">Supports PDF, JPG, or PNG</span>
              <input
                type="file"
                accept=".pdf, image/*"
                className="hidden"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          ) : (
            <div className="flex items-center justify-between p-3 border border-[var(--teal)] bg-teal-50/10 rounded-md shadow-sm">
              <div className="flex items-center space-x-3 overflow-hidden">
                <FileText className="w-6 h-6 text-[var(--teal)] flex-shrink-0" />
                <div className="flex flex-col truncate">
                  <span className="text-sm font-medium text-[var(--foreground)] truncate">
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="p-1.5 rounded-md hover:bg-red-100 text-red-500 transition-colors"
                title="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
        {/* --- END FILE UPLOAD UI --- */}
        
        <textarea
          className="flex min-h-[80px] w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]"
          value={form.medical_history_text}
          onChange={(e) => setForm((prev) => ({ ...prev, medical_history_text: e.target.value }))}
          placeholder="Manual medical history notes (or leave blank if attaching a file)"
        />
        
        <textarea
          className="flex min-h-[100px] w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]"
          value={form.current_examination}
          onChange={(e) => setForm((prev) => ({ ...prev, current_examination: e.target.value }))}
          placeholder="Current examination (Type fast, AI will translate!)"
        />
        
        <textarea
          className="flex min-h-[80px] w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]"
          value={form.medicines_prescribed}
          onChange={(e) => setForm((prev) => ({ ...prev, medicines_prescribed: e.target.value }))}
          placeholder="Medicines prescribed"
        />
        
        <textarea
          className="flex min-h-[80px] w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]"
          value={form.follow_up_details}
          onChange={(e) => setForm((prev) => ({ ...prev, follow_up_details: e.target.value }))}
          placeholder="Follow up details"
        />
        
        <Button loading={loading} onClick={submit} className="w-full mt-4">
          Generate AI Care Plan & Complete
        </Button>
      </div>
    </Card>
  );
}

export default function DoctorConsultationPage() {
  return (
    <Suspense fallback={
      <Card title="Submit Consultation">
        <p className="text-gray-500 text-sm">Loading consultation form...</p>
      </Card>
    }>
      <DoctorConsultationForm />
    </Suspense>
  );
}