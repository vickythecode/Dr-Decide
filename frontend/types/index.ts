export type Role = "Doctor" | "Patient" | "Receptionist";

export interface LoginResponse {
  message: string;
  access_token?: string;
  id_token?: string;
}

export interface DoctorDirectoryItem {
  doctor_id: string;
  doctor_name: string;
  specialty: string;
  clinic_name: string;
}

export interface PatientAppointmentsResponse {
  total_visits: number;
  appointments: AppointmentItem[];
}

export interface AppointmentItem {
  appointment_id: string;
  patient_email?: string;
  patient_id?: string;
  patient_name?: string;
  doctor_id?: string;
  doctor_email?: string;
  doctor_name?: string;
  clinic_name?: string;
  clinic?: string;
  clinic_id?: string;
  appointment_date: string;
  reason: string;
  status: string;
}

export interface NotificationsResponse {
  unread_count: number;
  notifications: NotificationItem[];
}

export interface NotificationItem {
  notification_id?: string;
  message: string;
  timestamp?: string;
  status?: string;
}

export interface DoctorDashboardResponse {
  metrics: {
    total_patients: number;
    today_appointments_booked: number;
    today_appointments_limit: number;
    care_plans_generated: number;
    critical_alerts: number;
  };
  todays_appointments: Array<{
    time: string;
    patient_id: string;
    reason: string;
  }>;
  hourly_capacity: Array<{
    time: string;
    booked: number;
    limit: number;
  }>;
}

export interface DoctorAppointmentItem {
  appointment_id: string;
  appointment_date: string;
  patient_id?: string;
  patient_name?: string;
  patient_email?: string;
  reason?: string;
  status?: string;
}

export interface DoctorPatientsItem {
  patient_id?: string;
  patient_name?: string;
  latest_appointment_id?: string;
  status?: string;
  follow_up_reminder?: string;
  adherence_percentage?: number;
}
