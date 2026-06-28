"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, Loader2, AlertTriangle, Mail, User, Check, X } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ""}/api`;

export default function SignUpPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("Password harus mengandung minimal 1 huruf kapital (uppercase).");
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':",.\<\>?/\\|`~]/.test(password)) {
      setError("Password harus mengandung minimal 1 simbol (contoh: !@#$%^&*).");
      return;
    }
    if (password !== confirmPw) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal mendaftar.");
        return;
      }

      // Redirect ke halaman verifikasi OTP
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = useCallback(async (credentialResponse: { credential?: string }) => {
    const idToken = credentialResponse.credential;
    if (!idToken) {
      setError("Gagal mendapatkan credential dari Google.");
      return;
    }

    setGoogleLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: idToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal mendaftar dengan Google.");
        return;
      }

      login(data.access_token, data.user);
      router.push("/");
    } catch (err) {
      console.error("Google signup error:", err);
      setError("Gagal menghubungi server. Pastikan backend berjalan.");
    } finally {
      setGoogleLoading(false);
    }
  }, [login, router]);

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(https://res.cloudinary.com/daxxzeeyr/image/upload/v1779725134/Gemini_Generated_Image_t6sx4tt6sx4tt6sx_qyuuzk.png)' }}
      />
      {/* Green Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a2e18]/85 via-[#114C2A]/75 to-[#1a663a]/80" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="https://res.cloudinary.com/daxxzeeyr/image/upload/v1779722843/WhatsApp_Image_2026-05-25_at_22.22.11-removebg-preview_1_uerl99.png"
            alt="Nutrilicious Logo"
            width={120}
            height={120}
            className="w-[120px] h-[120px] object-contain mx-auto mb-4 drop-shadow-lg"
          />
          <p className="text-white/60 text-sm mt-1">Buat akun gratis Anda</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-100 rounded-2xl">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm font-semibold text-red-600">{error}</p>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="signup-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Anda"
                  className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#114C2A]/30 focus:border-[#114C2A] outline-none transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="signup-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@contoh.com"
                  className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#114C2A]/30 focus:border-[#114C2A] outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 karakter, huruf kapital & simbol"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm focus:ring-2 focus:ring-[#114C2A]/30 focus:border-[#114C2A] outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Password strength rules */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {[
                    { ok: password.length >= 8, label: "Minimal 8 karakter" },
                    { ok: /[A-Z]/.test(password), label: "Mengandung huruf kapital (A-Z)" },
                    { ok: /[!@#$%^&*()_+\-=\[\]{};':",.\<\>?/\\|`~]/.test(password), label: "Mengandung simbol (!@#$%^&*)" },
                  ].map((rule, i) => (
                    <div key={i} className={`flex items-center gap-1.5 text-xs font-medium ${
                      rule.ok ? "text-emerald-600" : "text-slate-400"
                    }`}>
                      {rule.ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      {rule.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Konfirmasi Password</label>
              <input
                id="signup-confirm-password"
                type="password"
                required
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Ulangi password"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#114C2A]/30 focus:border-[#114C2A] outline-none transition-all"
              />
            </div>

            {/* Submit */}
            <button
              id="signup-submit"
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-[#114C2A] hover:bg-[#1a663a] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Mendaftarkan...</>
              ) : (
                "Daftar Sekarang"
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400 font-medium">atau</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Google Sign Up Button */}
          <div className="flex justify-center">
            {googleLoading ? (
              <div className="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-xl py-3.5 font-semibold text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Memproses...
              </div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Pendaftaran Google dibatalkan atau gagal.")}
                theme="outline"
                size="large"
                width="100%"
                text="signup_with"
                shape="rectangular"
                logo_alignment="left"
              />
            )}
          </div>

          <div className="mt-6">
            <p className="text-center text-sm text-slate-500">
              Sudah punya akun?{" "}
              <Link href="/sign-in" className="font-bold text-[#114C2A] hover:underline">
                Masuk di sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
