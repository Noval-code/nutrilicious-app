"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, MapPin, Navigation, Save, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
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

// Leaflet harus dimuat secara dynamic (SSR off) di Next.js
const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

export interface UserAddress {
  name: string;
  phone: string;
  address: string;
  lat: number | null;
  lng: number | null;
}

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (data: UserAddress) => void;
  initialData?: UserAddress | null;
}

export function AddressModal({ isOpen, onClose, onSaved, initialData }: AddressModalProps) {
  const { user } = useAuth();

  const [formData, setFormData] = useState<UserAddress>({
    name: "",
    phone: "",
    address: "",
    lat: null,
    lng: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Populate from initialData when modal opens
  useEffect(() => {
    if (isOpen && initialData) {
      setFormData(initialData);
    } else if (isOpen && user) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || user.name || "",
      }));
    }
  }, [isOpen, initialData, user]);

  // Detect user location
  const handleDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung geolokasi.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }));
        setIsLocating(false);
      },
      (err) => {
        console.error(err);
        alert("Gagal mendapatkan lokasi. Pastikan izin lokasi diaktifkan.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  // When map is clicked
  const handleMapClick = useCallback((lat: number, lng: number) => {
    setFormData((prev) => ({ ...prev, lat, lng }));
  }, []);

  // Handler khusus untuk input telepon: hanya izinkan angka, +, -, spasi
  const handlePhoneChange = (value: string) => {
    const filtered = value.replace(/[^\d+\-\s()]/g, "");
    setFormData({ ...formData, phone: filtered });
    if (phoneTouched) {
      setPhoneError(validatePhoneWA(filtered));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.name || !formData.phone || !formData.address) {
      alert("Semua field wajib diisi.");
      return;
    }

    // Validasi nomor WA
    const phoneErr = validatePhoneWA(formData.phone);
    if (phoneErr) {
      setPhoneError(phoneErr);
      setPhoneTouched(true);
      return;
    }

    if (formData.lat === null || formData.lng === null) {
      alert("Silakan pilih titik lokasi di peta.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/users/me`, {
        method: "POST",
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const savedUser = await res.json();
        onSaved({
          name: savedUser.name,
          phone: savedUser.phone,
          address: savedUser.address,
          lat: savedUser.lat,
          lng: savedUser.lng,
        });
      } else {
        alert("Gagal menyimpan alamat.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#114C2A] to-[#1a663a] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[#F9A826]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Alamat Pengiriman</h2>
              <p className="text-xs text-white/60">Isi data diri & pilih titik lokasi</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Penerima</label>
              <input
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#114C2A]/30 focus:border-[#114C2A] outline-none transition-all"
                placeholder="Nama lengkap penerima"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">No. Telepon / WA</label>
              <input
                required
                type="tel"
                inputMode="numeric"
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 outline-none transition-all ${
                  phoneError && phoneTouched
                    ? "border-red-400 focus:ring-red-200 focus:border-red-400"
                    : "border-slate-200 focus:ring-[#114C2A]/30 focus:border-[#114C2A]"
                }`}
                placeholder="0812-xxxx-xxxx"
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onBlur={() => {
                  setPhoneTouched(true);
                  setPhoneError(validatePhoneWA(formData.phone));
                }}
              />
              {phoneError && phoneTouched && (
                <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {phoneError}
                </p>
              )}
            </div>

            {/* Address text */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
              <textarea
                required
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#114C2A]/30 focus:border-[#114C2A] outline-none transition-all resize-none"
                placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kota"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                  {isLocating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Navigation className="w-3.5 h-3.5" />
                  )}
                  {isLocating ? "Mendeteksi..." : "Gunakan Lokasi Saya"}
                </button>
              </div>

              <div className="w-full h-[250px] rounded-xl overflow-hidden border border-slate-200">
                <LeafletMap
                  lat={formData.lat}
                  lng={formData.lng}
                  onMapClick={handleMapClick}
                />
              </div>

              {formData.lat !== null && formData.lng !== null && (
                <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Koordinat: {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-slate-50 shrink-0">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#114C2A] text-white rounded-xl font-bold shadow-lg hover:bg-[#1a663a] hover:shadow-xl transition-all disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? "Menyimpan..." : "Simpan Alamat"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
