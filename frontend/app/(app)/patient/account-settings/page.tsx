"use client";

import { useState } from "react";
import { Lock, User } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { api } from "@/lib/api"; // Assuming you have an Axios/Fetch wrapper here
import { validatePasswordPolicy } from "@/lib/passwordPolicy";

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
  const [showPasswords, setShowPasswords] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  const [passwordMessage, setPasswordMessage] = useState("");
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
    const validation = validatePasswordPolicy(passwords.newPassword);
    if (!validation.isValid) {
      setPasswordMessage(validation.issues.join(" "));
      pushToast("Please update your new password to match all requirements.", "info");
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
      setPasswordMessage("");

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
            <div className="relative">
              <Input 
                type={showPasswords.oldPassword ? "text" : "password"} 
                value={passwords.oldPassword} 
                onChange={(e) => setPasswords({...passwords, oldPassword: e.target.value})} 
                placeholder="Enter your current password"
                maxLength={99}
                className="pr-16"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-gray-700"
                onClick={() => setShowPasswords((prev) => ({ ...prev, oldPassword: !prev.oldPassword }))}
                aria-label={showPasswords.oldPassword ? "Hide current password" : "Show current password"}
              >
                {showPasswords.oldPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          
          <hr className="border-gray-100 my-4" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="mb-1 text-sm font-semibold text-gray-700">New Password</p>
              <div className="relative">
                <Input 
                  type={showPasswords.newPassword ? "text" : "password"} 
                  value={passwords.newPassword} 
                  onChange={(e) => {
                    const nextPassword = e.target.value;
                    setPasswords({...passwords, newPassword: nextPassword});
                    const validation = validatePasswordPolicy(nextPassword);
                    setPasswordMessage(validation.isValid ? "" : validation.issues.join(" "));
                  }}
                  placeholder="At least 8 characters"
                  minLength={8}
                  maxLength={99}
                  className="pr-16"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPasswords((prev) => ({ ...prev, newPassword: !prev.newPassword }))}
                  aria-label={showPasswords.newPassword ? "Hide new password" : "Show new password"}
                >
                  {showPasswords.newPassword ? "Hide" : "Show"}
                </button>
              </div>
              <p className={`mt-1 text-xs ${passwordMessage ? "text-red-600" : "text-[var(--muted)]"}`}>
                {passwordMessage ||
                  "Password must be 8-99 chars and include uppercase, lowercase, number, and special character. 12+ is recommended."}
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-gray-700">Confirm New Password</p>
              <div className="relative">
                <Input 
                  type={showPasswords.confirmPassword ? "text" : "password"} 
                  value={passwords.confirmPassword} 
                  onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})} 
                  placeholder="Type new password again"
                  maxLength={99}
                  className="pr-16"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPasswords((prev) => ({ ...prev, confirmPassword: !prev.confirmPassword }))}
                  aria-label={showPasswords.confirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showPasswords.confirmPassword ? "Hide" : "Show"}
                </button>
              </div>
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
