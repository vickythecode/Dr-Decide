"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { verifyEmail } from "@/lib/services";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { pushToast } = useToast();
  
  // Grab the email AND the role from the URL 
  const email = searchParams.get("email") || "";
  const role = searchParams.get("role") || "patient";
  
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!code || code.length < 6) {
      pushToast("Please enter a valid 6-digit code", "error");
      return;
    }

    setLoading(true);
    try {
      await verifyEmail(email, code);
      pushToast("Email verified successfully! Please log in.", "success");
      
      // Dynamically push to the correct login route
      router.push(`/auth/login/${role}`); 
    } catch (error) {
      pushToast("Invalid or expired verification code. Try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Verify Your Email">
      <p className="muted mb-4 text-sm">
        We sent a 6-digit verification code to <span className="font-semibold text-[var(--foreground)]">{email || "your email address"}</span>. 
        Please enter it below to activate your account.
      </p>
      
      <div className="space-y-4">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter 6-digit code"
          maxLength={6}
          // Added font-mono and custom tracking to make the numbers look like a real auth code
          className="text-center tracking-[0.5em] font-mono text-lg"
        />
        
        <Button loading={loading} onClick={submit} className="w-full">
          Verify Account
        </Button>
      </div>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <Card title="Verify Your Email">
        <p className="muted text-sm">Loading verification securely...</p>
      </Card>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}