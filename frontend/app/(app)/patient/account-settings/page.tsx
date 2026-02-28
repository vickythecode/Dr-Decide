"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";

export default function PatientAccountSettingsPage() {
  const { pushToast } = useToast();
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("patient_settings_email") || "";
  });
  const [phone, setPhone] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("patient_settings_phone") || "";
  });
  const [language, setLanguage] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("patient_settings_language") || "";
  });
  const [loading, setLoading] = useState(false);

  function save() {
    setLoading(true);
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("patient_settings_email", email);
        window.localStorage.setItem("patient_settings_phone", phone);
        window.localStorage.setItem("patient_settings_language", language);
      }
      setLoading(false);
      pushToast("Account settings saved locally", "success");
    }, 500);
  }

  return (
    <Card title="Account Settings">
      <div className="space-y-3">
        <div>
          <p className="mb-1 text-sm font-semibold">Email</p>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">Phone</p>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">Language</p>
          <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
        </div>
        <Button loading={loading} onClick={save}>Save Settings</Button>
      </div>
    </Card>
  );
}
