"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Lock,
  Save,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  Navigation,
  AlertTriangle,
  AlertCircle,
  Check,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";

/**
 * Validasi nomor telepon/WhatsApp Indonesia.
 * Format yang diterima: 08xx, 628xx, +628xx (10-15 digit angka).
 */
function validatePhoneWA(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (!cleaned) return "Nomor telepon wajib diisi.";
  if (!/^\d+$/.test(cleaned.replace(/^\+/, ""))) return "Nomor telepon hanya boleh berisi angka.";
  const normalized = cleaned.replace(/^\+/, "");
  if (!/^(08|628)/.test(normalized)) return "Nomor harus diawali 08 atau 628 (format Indonesia).";
  const digitCount = normalized.length;
  if (digitCount < 10 || digitCount > 15) return "Nomor telepon harus 10–15 digit.";
  return null;
}

const LeafletMap = dynamic(
  () => import("@/components/address/LeafletMap"),
  { ssr: false }
);

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ""}/api`;

interface ProfileData {
  name: string;
  phone: string;
  address: string;
  lat: number | null;
  lng: number | null;
}

export default function SettingsPage() {
  const { user, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "address">("profile");

  // Profile form
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    phone: "",
    address: "",
    lat: null,
    lng: null,
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  // Address
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressSuccess, setAddressSuccess] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Phone validation
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch profile
  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id) return;
      try {
        const res = await authFetch(`${API_URL}/users/me`);
        if (res.ok) {
          const data = await res.json();
          setProfile({
            name: data.name || user?.name || "",
            phone: data.phone || "",
            address: data.address || "",
            lat: data.lat ?? null,
            lng: data.lng ?? null,
          });
        }
      } catch (err) {
        console.error("Gagal memuat profil:", err);
      } finally {
        setProfileLoading(false);
      }
    }
    if (isLoaded && isSignedIn) fetchProfile();
  }, [isLoaded, isSignedIn, user]);

  // Handler khusus untuk input telepon
  const handlePhoneChange = (value: string) => {
    const filtered = value.replace(/[^\d+\-\s()]/g, "");
    setProfile({ ...profile, phone: filtered });
    if (phoneTouched) {
      setPhoneError(validatePhoneWA(filtered));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    // Validasi nomor WA sebelum submit
    const phoneErr = validatePhoneWA(profile.phone);
    if (phoneErr) {
      setPhoneError(phoneErr);
      setPhoneTouched(true);
      return;
    }

    setProfileSaving(true);
    setProfileSuccess(false);
    try {
      const res = await authFetch(`${API_URL}/users/me`, {
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          address: profile.address,
          lat: profile.lat,
          lng: profile.lng,
        }),
      });
      if (res.ok) {
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);

    if (newPassword.length < 8) {
      setPwError("Password baru minimal 8 karakter.");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setPwError("Password harus mengandung minimal 1 huruf kapital (uppercase).");
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':",.\<\>?/\\|`~]/.test(newPassword)) {
      setPwError("Password harus mengandung minimal 1 simbol (contoh: !@#$%^&*).");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Konfirmasi password tidak cocok.");
      return;
    }

    setPwSaving(true);
    try {
      const res = await authFetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      if (res.ok) {
        setPwSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPwSuccess(false), 3000);
      } else {
        const errData = await res.json();
        setPwError(errData.error || "Gagal mengubah password.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengubah password.";
      setPwError(msg);
    } finally {
      setPwSaving(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!profile.address) {
      alert("Alamat wajib diisi.");
      return;
    }
    if (profile.lat === null || profile.lng === null) {
      alert("Silakan pilih titik lokasi di peta.");
      return;
    }
    setAddressSaving(true);
    setAddressSuccess(false);
    try {
      const res = await authFetch(`${API_URL}/users/me`, {
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setAddressSuccess(true);
        setTimeout(() => setAddressSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddressSaving(false);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser tidak mendukung geolokasi.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setProfile((p) => ({ ...p, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setIsLocating(false);
      },
      () => {
        alert("Gagal mendapatkan lokasi.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const tabs = [
    { key: "profile" as const, label: "Profil", icon: User },
    { key: "password" as const, label: "Password", icon: Lock },
    { key: "address" as const, label: "Alamat", icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#114C2A] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Beranda
        </Link>

        <h1 className="text-3xl font-extrabold text-[#114C2A] mb-2">Pengaturan Akun</h1>
        <p className="text-slate-500 text-sm mb-8">
          Kelola informasi profil, keamanan, dan alamat pengiriman Anda.
        </p>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                  isActive
                    ? "bg-white text-[#114C2A] shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <User className="w-4 h-4 text-[#114C2A]" /> Informasi Profil
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Data ini digunakan untuk pengiriman pesanan.</p>
            </div>

            {profileLoading ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Avatar + Email */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#114C2A] to-[#1a663a] flex items-center justify-center text-white font-black text-xl">
                    {(profile.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{profile.name || user?.name}</p>
                    <p className="text-sm text-slate-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {user?.email}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Lengkap</label>
                  <input
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#114C2A]/30 focus:border-[#114C2A] outline-none transition-all"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Nama lengkap"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">No. Telepon / WA</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type="tel"
                      inputMode="numeric"
                      className={`w-full border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 outline-none transition-all ${
                        phoneError && phoneTouched
                          ? "border-red-400 focus:ring-red-200 focus:border-red-400"
                          : "border-slate-200 focus:ring-[#114C2A]/30 focus:border-[#114C2A]"
                      }`}
                      value={profile.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onBlur={() => {
                        setPhoneTouched(true);
                        setPhoneError(validatePhoneWA(profile.phone));
                      }}
                      placeholder="0812-xxxx-xxxx"
                    />
                  </div>
                  {phoneError && phoneTouched && (
                    <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {phoneError}
                    </p>
                  )}
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="bg-[#114C2A] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#1a663a] transition-colors shadow-md disabled:opacity-50"
                  >
                    {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {profileSaving ? "Menyimpan..." : "Simpan Profil"}
                  </button>
                  {profileSuccess && (
                    <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1 animate-in fade-in duration-300">
                      <CheckCircle2 className="w-4 h-4" /> Tersimpan!
                    </span>
                  )}
                </div>
              </div>
            )}
          </form>
        )}

        {/* Password Tab */}
        {activeTab === "password" && (
          <form onSubmit={handleChangePassword} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#114C2A]" /> Ubah Password
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Pastikan menggunakan password yang kuat dan unik.</p>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password Saat Ini</label>
                <div className="relative">
                  <input
                    required
                    type={showCurrentPw ? "text" : "password"}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-[#114C2A]/30 focus:border-[#114C2A] outline-none transition-all"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password saat ini"
                  />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password Baru</label>
                <div className="relative">
                  <input
                    required
                    type={showNewPw ? "text" : "password"}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-[#114C2A]/30 focus:border-[#114C2A] outline-none transition-all"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 karakter, huruf kapital & simbol"
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Password strength rules */}
                {newPassword.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {[
                      { ok: newPassword.length >= 8, label: "Minimal 8 karakter" },
                      { ok: /[A-Z]/.test(newPassword), label: "Mengandung huruf kapital (A-Z)" },
                      { ok: /[!@#$%^&*()_+\-=\[\]{};':",.\<\>?/\\|`~]/.test(newPassword), label: "Mengandung simbol (!@#$%^&*)" },
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

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Konfirmasi Password Baru</label>
                <input
                  required
                  type="password"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#114C2A]/30 focus:border-[#114C2A] outline-none transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                />
              </div>

              {pwError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-600 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {pwError}
                </div>
              )}

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={pwSaving}
                  className="bg-[#114C2A] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#1a663a] transition-colors shadow-md disabled:opacity-50"
                >
                  {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  {pwSaving ? "Menyimpan..." : "Ubah Password"}
                </button>
                {pwSuccess && (
                  <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1 animate-in fade-in duration-300">
                    <CheckCircle2 className="w-4 h-4" /> Password berhasil diubah!
                  </span>
                )}
              </div>
            </div>
          </form>
        )}

        {/* Address Tab */}
        {activeTab === "address" && (
          <form onSubmit={handleSaveAddress} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#114C2A]" /> Alamat Pengiriman
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Atur alamat utama untuk pengiriman pesanan.</p>
            </div>

            {profileLoading ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
              </div>
            ) : (
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Alamat Lengkap</label>
                  <textarea
                    required
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#114C2A]/30 focus:border-[#114C2A] outline-none transition-all resize-none"
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kota"
                  />
                </div>

                {/* Map */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-700">Titik Lokasi di Peta</label>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={isLocating}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#114C2A] hover:text-[#1a663a] transition-colors disabled:opacity-50"
                    >
                      {isLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                      {isLocating ? "Mendeteksi..." : "Gunakan Lokasi Saya"}
                    </button>
                  </div>

                  <div className="w-full h-[300px] rounded-xl overflow-hidden border border-slate-200">
                    <LeafletMap
                      lat={profile.lat}
                      lng={profile.lng}
                      onMapClick={(lat: number, lng: number) =>
                        setProfile((p) => ({ ...p, lat, lng }))
                      }
                    />
                  </div>

                  {profile.lat !== null && profile.lng !== null && (
                    <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Koordinat: {profile.lat.toFixed(6)}, {profile.lng.toFixed(6)}
                    </p>
                  )}
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={addressSaving}
                    className="bg-[#114C2A] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#1a663a] transition-colors shadow-md disabled:opacity-50"
                  >
                    {addressSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {addressSaving ? "Menyimpan..." : "Simpan Alamat"}
                  </button>
                  {addressSuccess && (
                    <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1 animate-in fade-in duration-300">
                      <CheckCircle2 className="w-4 h-4" /> Alamat tersimpan!
                    </span>
                  )}
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
