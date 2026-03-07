"use client";

import { useState } from "react";
import { Lock, User } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { api } from "@/lib/api"; // Assuming you have an Axios/Fetch wrapper here

export default function PatientAccountSettingsPage() {
  const { pushToast } = useToast();
  
  // --- Profile Settings State ---
  const [email, setEmail] = useState(() => typeof window !== "undefined" ? window.localStorage.getItem("patient_settings_email") || "" : "");
  const [phone, setPhone] = useState(() => typeof window !== "undefined" ? window.localStorage.getItem("patient_settings_phone") || "" : "");
  const [language, setLanguage] = useState(() => typeof window !== "undefined" ? window.localStorage.getItem("patient_settings_language") || "" : "");
  

  // --- Password Reset State ---
  const [passwords, setPasswords] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordLoading, setPasswordLoading] = useState(false);


  // --- Password Handlers ---
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    // 1. Basic UI Validation
    if (!passwords.oldPassword || !passwords.newPassword || !passwords.confirmPassword) {
      pushToast("Please fill in all password fields", "error");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      pushToast("New passwords do not match", "error");
      return;
    }
    if (passwords.oldPassword === passwords.newPassword) {
      pushToast("New password must be different from the old one", "error");
      return;
    }

    setPasswordLoading(true);
    try {
      // 2. Fetch the token (Adjust this depending on how you store your Cognito token)
      const token = localStorage.getItem("token"); 
      
      // 3. Send to your FastAPI backend
      await api.post("/api/auth/change-password", {
        old_password: passwords.oldPassword,
        new_password: passwords.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      pushToast("Password changed successfully!", "success");
      
      // 4. Clear the form on success
      setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });

    } catch (error: any) {
      // Safely extract the FastAPI HTTP Exception detail
      const errorMsg = error.response?.data?.detail || "Failed to change password";
      pushToast(errorMsg, "error");
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12 pt-4">
      
   
      {/* --- SECURITY / PASSWORD SECTION --- */}
      <Card title="Security & Password">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <p className="mb-1 text-sm font-semibold text-gray-700">Current Password</p>
            <Input 
              type="password" 
              value={passwords.oldPassword} 
              onChange={(e) => setPasswords({...passwords, oldPassword: e.target.value})} 
              placeholder="Enter your current password"
            />
          </div>
          
          <hr className="border-gray-100 my-4" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="mb-1 text-sm font-semibold text-gray-700">New Password</p>
              <Input 
                type="password" 
                value={passwords.newPassword} 
                onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})} 
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-gray-700">Confirm New Password</p>
              <Input 
                type="password" 
                value={passwords.confirmPassword} 
                onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})} 
                placeholder="Type new password again"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" loading={passwordLoading} className="w-full md:w-auto bg-gray-900 text-white hover:bg-gray-800">
              Update Password
            </Button>
          </div>
        </form>
      </Card>

    </div>
  );
}