import { redirect } from "next/navigation";

export default function PatientDoctorsPage() {
  redirect("/patient/book-appointment");
}
