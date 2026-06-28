"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, Loader2, AlertTriangle, Mail } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ""}/api`;

export default function SignInPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [needVerify, setNeedVerify] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNeedVerify(false);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.need_verification) {
          setNeedVerify(true);
          setError("Akun belum diverifikasi. Silakan cek email Anda.");
        } else {
          setError(data.error || "Gagal masuk.");
        }
        return;
      }

      login(data.access_token, data.user);
      router.push("/");
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
        setError(data.error || "Gagal masuk dengan Google.");
        return;
      }

      login(data.access_token, data.user);
      router.push("/");
    } catch (err) {
      console.error("Google login error:", err);
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
          <p className="text-white/60 text-sm mt-1">Masuk ke akun Anda</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-100 rounded-2xl">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-600">{error}</p>
                  {needVerify && (
                    <Link
                      href={`/verify-email?email=${encodeURIComponent(email)}`}
                      className="text-xs font-bold text-[#114C2A] underline mt-1 inline-block"
                    >
                      Verifikasi email sekarang →
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="signin-email"
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
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="signin-password"
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password Anda"
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
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end -mt-1">
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-[#114C2A] hover:underline"
              >
                Lupa password?
              </Link>
            </div>

            {/* Submit */}
            <button
              id="signin-submit"
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-[#114C2A] hover:bg-[#1a663a] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
              ) : (
                "Masuk"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400 font-medium">atau</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Google Sign In Button */}
          <div className="flex justify-center">
            {googleLoading ? (
              <div className="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-xl py-3.5 font-semibold text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Memproses...
              </div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Login Google dibatalkan atau gagal.")}
                theme="outline"
                size="large"
                width="100%"
                text="signin_with"
                shape="rectangular"
                logo_alignment="left"
              />
            )}
          </div>

          <div className="mt-6">
            <p className="text-center text-sm text-slate-500">
              Belum punya akun?{" "}
              <Link href="/sign-up" className="font-bold text-[#114C2A] hover:underline">
                Daftar sekarang
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
