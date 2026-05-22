"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Leaf,
  Loader2,
  AlertTriangle,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api`;

type Step = "email" | "otp" | "success";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Step 1: Kirim OTP ke email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal mengirim kode OTP.");
        return;
      }

      setInfo(data.message);
      setStep("otp");
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verifikasi OTP + Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (newPassword !== confirmPassword) {
      setError("Password baru dan konfirmasi tidak cocok.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal mereset password.");
        return;
      }

      setStep("success");
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // Kirim ulang OTP
  const handleResendOtp = async () => {
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal mengirim ulang kode OTP.");
        return;
      }

      setInfo("Kode OTP baru telah dikirim ke email Anda.");
      setOtp("");
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setLoading(false);
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
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Nutrilicious</h1>
          <p className="text-white/60 text-sm mt-1">
            {step === "email" && "Reset password akun Anda"}
            {step === "otp" && "Masukkan kode verifikasi"}
            {step === "success" && "Password berhasil direset!"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* ─── STEP 1: Input Email ─── */}
          {step === "email" && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              {/* Back to login */}
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#114C2A] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke login
              </Link>

              {/* Header */}
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">Lupa Password?</h2>
                <p className="text-sm text-slate-500">
                  Masukkan email yang terdaftar. Kami akan mengirimkan kode OTP untuk mereset password Anda.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-100 rounded-2xl">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm font-semibold text-red-600">{error}</p>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@contoh.com"
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#114C2A]/30 focus:border-[#114C2A] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                id="forgot-submit"
                type="submit"
                disabled={loading}
                className="w-full bg-[#114C2A] hover:bg-[#1a663a] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</>
                ) : (
                  <><Mail className="w-4 h-4" /> Kirim Kode OTP</>
                )}
              </button>
            </form>
          )}

          {/* ─── STEP 2: Input OTP + New Password ─── */}
          {step === "otp" && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {/* Back */}
              <button
                type="button"
                onClick={() => { setStep("email"); setError(""); setInfo(""); }}
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#114C2A] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Ganti email
              </button>

              {/* Header */}
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">Verifikasi & Reset</h2>
                <p className="text-sm text-slate-500">
                  Kode OTP telah dikirim ke <span className="font-semibold text-[#114C2A]">{email}</span>
                </p>
              </div>

              {/* Info */}
              {info && (
                <div className="flex items-start gap-2.5 p-4 bg-green-50 border border-green-100 rounded-2xl">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <p className="text-sm font-semibold text-green-600">{info}</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-100 rounded-2xl">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm font-semibold text-red-600">{error}</p>
                </div>
              )}

              {/* OTP Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kode OTP</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="forgot-otp"
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="Masukkan 6 digit kode"
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm tracking-[0.3em] font-mono text-center focus:ring-2 focus:ring-[#114C2A]/30 focus:border-[#114C2A] outline-none transition-all"
                  />
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password Baru</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="forgot-new-password"
                    type={showPw ? "text" : "password"}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-sm focus:ring-2 focus:ring-[#114C2A]/30 focus:border-[#114C2A] outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Konfirmasi Password Baru</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="forgot-confirm-password"
                    type={showConfirmPw ? "text" : "password"}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-sm focus:ring-2 focus:ring-[#114C2A]/30 focus:border-[#114C2A] outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                id="forgot-reset-submit"
                type="submit"
                disabled={loading}
                className="w-full bg-[#114C2A] hover:bg-[#1a663a] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
                ) : (
                  <><KeyRound className="w-4 h-4" /> Reset Password</>
                )}
              </button>

              {/* Resend OTP */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-sm font-semibold text-[#114C2A] hover:underline inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Kirim ulang kode OTP
                </button>
              </div>
            </form>
          )}

          {/* ─── STEP 3: Success ─── */}
          {step === "success" && (
            <div className="text-center py-4 space-y-5">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">Password Berhasil Direset!</h2>
                <p className="text-sm text-slate-500">
                  Silakan login dengan password baru Anda.
                </p>
              </div>
              <button
                onClick={() => router.push("/sign-in")}
                className="w-full bg-[#114C2A] hover:bg-[#1a663a] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                Masuk Sekarang
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
