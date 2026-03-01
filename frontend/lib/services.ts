import { api } from "@/lib/api";
import {
  DoctorAppointmentItem,
  DoctorDashboardResponse,
  DoctorDirectoryItem,
  DoctorPatientsItem,
  LoginResponse,
  NotificationsResponse,
  PatientAppointmentsResponse,
  Role,
} from "@/types";

export async function signup(payload: {
  email: string;
  password: string;
  role: Role;
}) {
  const { data } = await api.post("/api/auth/signup", payload);
  return data as { message: string };
}

export async function login(payload: { email: string; password: string }) {
  const { data } = await api.post("/api/auth/login", payload);
  return data as LoginResponse;
}

export async function patientDoctors(params: {
  specialty?: string;
  clinic_name?: string;
}) {
  const { data } = await api.get("/api/patient/doctors", { params });
  return data as { total_found: number; doctors: DoctorDirectoryItem[] };
}

export async function bookAppointment(payload: {
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  reason: string;
}) {
  const { data } = await api.post("/api/patient/book-appointment", payload);
  return data as { message: string; appointment_id: string; status: string };
}

export async function patientAppointments() {
  const { data } = await api.get("/api/patient/my-appointments");
  return data as PatientAppointmentsResponse;
}

export async function patientCarePlan() {
  const { data } = await api.get("/api/patient/my-plan");
  return data as {
    patient_id: string;
    simplified_plan: string;
    follow_up_reminder: string;
    status: string;
  };
}

export async function logTask(payload: { task_id: string; status: string }) {
  const { data } = await api.post("/api/patient/log-task", payload);
  return data as { message: string };
}

export async function patientNotifications() {
  const { data } = await api.get("/api/patient/notifications");
  return data as NotificationsResponse;
}

export async function doctorSetupProfile(payload: {
  doctor_name: string;
  specialty: string;
  clinic_name: string;
}) {
  const { data } = await api.post("/api/doctor/setup-profile", payload);
  return data;
}

export async function doctorDashboardStats() {
  const { data } = await api.get("/api/doctor/dashboard-stats");
  return data as DoctorDashboardResponse;
}

export async function doctorAppointments() {
  // 1. Fetch both API routes simultaneously for maximum speed
  const [appointmentsRes, patientsRes] = await Promise.all([
    api.get("/api/doctor/my-appointments"),
    api.get("/api/doctor/my-patients")
  ]);

  const apptData = appointmentsRes.data;
  const patientData = patientsRes.data;

  // 2. Create a fast lookup map for patient names: { "123-abc": "John Doe" }
  const patientNameMap: Record<string, string> = {};
  
  if (patientData && patientData.patients) {
    patientData.patients.forEach((patient: any) => {
      patientNameMap[patient.patient_id] = patient.patient_name;
    });
  }

  // 3. Loop through the appointments and inject the patient's real name
  const enrichedSchedule = apptData.schedule.map((appt: any) => ({
    ...appt,
    // Add the name if we found it, otherwise fallback to "Unknown"
    patient_name: patientNameMap[appt.patient_id] || "Unknown Patient"
  }));

  // 4. Return the enriched data matching your TypeScript interface
  return {
    total_appointments: apptData.total_appointments,
    schedule: enrichedSchedule
  } as { total_appointments: number; schedule: DoctorAppointmentItem[] };
}

export async function doctorPatients() {
  const { data } = await api.get("/api/doctor/my-patients");
  return data as { total_patients: number; patients: DoctorPatientsItem[] };
}

export async function doctorConsultation(payload: {
  patient_id: string;
  appointment_id: string;
  phone_number: string;
  medical_history: string;
  current_examination: string;
  medicines_prescribed: string;
  follow_up_details: string;
}) {
  const { data } = await api.post("/api/doctor/consultation", payload);
  return data;
}

export async function hospitalCheckIn(payload: {
  patient_id: string;
  appointment_id: string;
}) {
  const { data } = await api.post(`/api/hospital/check-in/${payload.patient_id}`, undefined, {
    params: { appointment_id: payload.appointment_id },
  });
  return data;
}

export async function hospitalQueue() {
  const { data } = await api.get("/api/hospital/queue-status");
  return data as { current_queue: Array<Record<string, unknown>> };
}
