"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { verifyEmail, resendCode } from "@/lib/services";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { pushToast } = useToast();
  
  const email = searchParams.get("email") || "";
  const role = searchParams.get("role") || "patient";
  
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  async function submit() {
    if (!code || code.length < 6) {
      pushToast("Please enter a valid 6-digit code", "error");
      return;
    }

    setLoading(true);
    try {
      await verifyEmail(email, code);
      pushToast("Email verified successfully! Please log in.", "success");
      router.push(`/auth/login/${role}`); 
    } catch (error) {
      pushToast("Invalid or expired verification code. Try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (timer > 0 || resending) return;
    
    setResending(true);
    try {
      await resendCode(email);
      pushToast("A new code has been sent to your email.", "success");
      setTimer(60); // 60-second cooldown to prevent API spam
    } catch (error) {
      pushToast("Failed to resend code. Please try again later.", "error");
    } finally {
      setResending(false);
    }
  }

  return (
    <Card title="Verify Your Email">
      <div className="text-center mb-6">
        <p className="text-sm text-gray-500">
          We sent a 6-digit verification code to:
        </p>
        <p className="font-semibold text-gray-900">{email || "your email address"}</p>
      </div>
      
      <div className="space-y-6">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="000000"
          maxLength={6}
          className="text-center tracking-[0.5em] font-mono text-2xl py-6"
        />
        
        <Button loading={loading} onClick={submit} className="w-full py-3">
          Verify Account
        </Button>

        {/* RESEND SECTION */}
        <div className="pt-4 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600 mb-2">Didn't receive the code?</p>
          <button 
            type="button"
            disabled={timer > 0 || resending}
            onClick={handleResend}
            className={`text-sm font-bold transition-colors ${
              timer > 0 || resending 
                ? "text-gray-400 cursor-not-allowed" 
                : "text-blue-600 hover:text-blue-800"
            }`}
          >
            {resending ? (
              "Sending..."
            ) : timer > 0 ? (
              `Resend available in ${timer}s`
            ) : (
              "Resend New Code"
            )}
          </button>
        </div>
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