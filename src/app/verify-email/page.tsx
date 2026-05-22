"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Leaf, Loader2, CheckCircle2, AlertTriangle, RefreshCw, Mail } from "lucide-react";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api`;

function VerifyEmailContent() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const [countdown, setCountdown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown untuk tombol resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[idx] = val.slice(-1);
    setOtp(newOtp);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpStr = otp.join("");
    if (otpStr.length < 6) {
      setError("Masukkan 6 digit kode OTP.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailParam, otp: otpStr }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verifikasi gagal.");
        return;
      }

      setSuccess(true);
      login(data.access_token, data.user);
      setTimeout(() => router.push("/"), 1500);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResendMsg("");
    setError("");
    setResending(true);

    try {
      const res = await fetch(`${API_URL}/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailParam }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendMsg("Kode OTP baru telah dikirim!");
        setCountdown(60);
      } else {
        setError(data.error || "Gagal mengirim ulang.");
      }
    } catch {
      setError("Terjadi kesalahan.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a2e18] via-[#114C2A] to-[#1a663a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4 border border-white/20">
            <Leaf className="w-8 h-8 text-[#F9A826]" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Verifikasi Email</h1>
          <p className="text-white/60 text-sm mt-1">Masukkan kode 6 digit yang dikirim ke email Anda</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9 text-emerald-500" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800">Email Terverifikasi!</h2>
              <p className="text-slate-500 text-sm mt-1">Mengalihkan ke beranda...</p>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-6">
              {/* Email info */}
              <div className="flex items-center gap-3 p-4 bg-[#114C2A]/5 rounded-2xl">
                <div className="w-9 h-9 bg-[#114C2A]/10 rounded-xl flex items-center justify-center">
                  <Mail className="w-4 h-4 text-[#114C2A]" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Kode dikirim ke</p>
                  <p className="text-sm font-bold text-slate-800 truncate">{emailParam || "email Anda"}</p>
                </div>
              </div>

              {/* Error / Success Message */}
              {error && (
                <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-sm font-semibold text-red-600">{error}</p>
                </div>
              )}
              {resendMsg && (
                <div className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-sm font-semibold text-emerald-600">{resendMsg}</p>
                </div>
              )}

              {/* OTP Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3 text-center">
                  Kode Verifikasi
                </label>
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { inputRefs.current[idx] = el; }}
                      id={`otp-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-12 h-14 text-center text-xl font-black border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#114C2A]/30 focus:border-[#114C2A] outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  ))}
                </div>
                <p className="text-center text-xs text-slate-400 mt-2">Berlaku selama 15 menit</p>
              </div>

              {/* Submit */}
              <button
                id="verify-submit"
                type="submit"
                disabled={loading}
                className="w-full bg-[#114C2A] hover:bg-[#1a663a] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Memverifikasi...</>
                ) : (
                  "Verifikasi Sekarang"
                )}
              </button>

              {/* Resend */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || countdown > 0}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#114C2A] hover:underline disabled:text-slate-400 disabled:no-underline transition-colors"
                >
                  {resending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  {countdown > 0 ? `Kirim ulang dalam ${countdown}s` : "Kirim ulang kode"}
                </button>
              </div>

              <p className="text-center text-sm text-slate-400">
                Email salah?{" "}
                <Link href="/sign-up" className="font-bold text-[#114C2A] hover:underline">
                  Daftar ulang
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#114C2A]">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
