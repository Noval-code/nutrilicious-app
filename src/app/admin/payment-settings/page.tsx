"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CreditCard, Loader2, Save } from 'lucide-react';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ''}/api`;

interface PaymentSettings {
  _id?: string;
  dp_enabled: boolean;
  package_dp_percentage: number;
  event_dp_percentage: number;
}

export default function PaymentSettingsPage() {
  const [settings, setSettings] = useState<PaymentSettings>({
    dp_enabled: true,
    package_dp_percentage: 50,
    event_dp_percentage: 30,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/payment-settings/`);
      if (!res.ok) throw new Error('Gagal memuat pengaturan pembayaran');
      setSettings(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => setSuccessMsg(null), 3000);
    return () => clearTimeout(timer);
  }, [successMsg]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch(`${API_URL}/payment-settings/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan pengaturan pembayaran');
      setSettings(data);
      setSuccessMsg('Pengaturan pembayaran berhasil disimpan');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-[#114C2A] tracking-tight">Pengaturan Pembayaran</h1>
        <p className="text-slate-500 mt-1">Atur opsi pembayaran DP untuk paket langganan dan pesanan acara.</p>
      </div>

      {successMsg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-sm font-bold">{successMsg}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#114C2A] animate-spin" />
          <span className="ml-3 text-slate-500 font-medium">Memuat pengaturan...</span>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 max-w-2xl space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#114C2A]/10 text-[#114C2A] rounded-2xl flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-xl text-slate-800">Opsi DP</h2>
              <p className="text-sm text-slate-500 mt-1">Jika aktif, user bisa memilih bayar DP pada checkout untuk paket langganan dan pesanan menu acara.</p>
            </div>
          </div>

          <label className="flex items-center justify-between gap-4 bg-slate-50 rounded-2xl p-4 border border-gray-100">
            <div>
              <p className="font-bold text-slate-700">Aktifkan Pembayaran DP</p>
              <p className="text-xs text-slate-400 mt-0.5">Jika nonaktif, semua pesanan wajib bayar full.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.dp_enabled}
              onChange={(e) => setSettings(prev => ({ ...prev, dp_enabled: e.target.checked }))}
              className="w-5 h-5 accent-[#114C2A]"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">DP Paket Langganan (%)</label>
              <input
                type="number"
                min="1"
                max="99"
                value={settings.package_dp_percentage}
                onChange={(e) => setSettings(prev => ({ ...prev, package_dp_percentage: Number(e.target.value) || 1 }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#F9A826] font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">DP Pesanan Acara (%)</label>
              <input
                type="number"
                min="1"
                max="99"
                value={settings.event_dp_percentage}
                onChange={(e) => setSettings(prev => ({ ...prev, event_dp_percentage: Number(e.target.value) || 1 }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#F9A826] font-medium"
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-sm font-medium">
            DP hanya ditawarkan untuk paket langganan dan menu perporsi jenis acara. Pesanan coba menu tetap bayar full.
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#114C2A] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#1a663a] transition-colors shadow-md disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Pengaturan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
