"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock, Loader2, PackageCheck, RefreshCw, Truck, XCircle } from 'lucide-react';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ''}/api`;

interface DeliveryLog {
  _id: string;
  order_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  package_name: string;
  duration: string;
  meal_type: string;
  delivery_day: number;
  total_days: number;
  delivery_date: string;
  status: string;
  recipient_status: string;
  receiver_name?: string;
  admin_note?: string;
  received_at?: string;
  default_menus?: Record<'lunch' | 'dinner', { title: string } | undefined>;
  custom_menus?: Record<'lunch' | 'dinner', { title: string; original_menu_title?: string } | undefined>;
}

const MEAL_SLOT_LABELS: Record<'lunch' | 'dinner', string> = {
  lunch: 'Lunch',
  dinner: 'Dinner',
};

function getMealSlots(mealType: string): ('lunch' | 'dinner')[] {
  if (mealType === 'Lunch') return ['lunch'];
  if (mealType === 'Dinner') return ['dinner'];
  if (mealType === 'Lunch & Dinner') return ['lunch', 'dinner'];
  return [];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: 'Menunggu', color: 'text-slate-600', bg: 'bg-slate-100', icon: Clock },
  prepared: { label: 'Disiapkan', color: 'text-amber-600', bg: 'bg-amber-50', icon: PackageCheck },
  on_delivery: { label: 'Dikirim', color: 'text-blue-600', bg: 'bg-blue-50', icon: Truck },
  delivered: { label: 'Terkirim', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
  received: { label: 'Diterima', color: 'text-[#114C2A]', bg: 'bg-emerald-100', icon: CheckCircle2 },
  failed: { label: 'Gagal', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DeliveryLogsPage() {
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const res = await fetch(`${API_URL}/delivery-logs/?${params.toString()}`);
      if (res.ok) setLogs(await res.json());
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const updateStatus = async (log: DeliveryLog, status: string) => {
    setUpdatingId(log._id);
    try {
      const res = await fetch(`${API_URL}/delivery-logs/${log._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLogs(prev => prev.map(item => item._id === log._id ? updated : item));
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#114C2A] tracking-tight">Log Pengiriman</h1>
          <p className="text-slate-500 mt-1">Pantau pengiriman harian paket langganan dan konfirmasi penerima.</p>
        </div>
        <button onClick={fetchLogs} className="bg-[#114C2A] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#1a663a] transition-colors shadow-md">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-slate-50/50">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#F9A826]"
          >
            <option value="all">Semua Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="font-semibold text-sm">Memuat log pengiriman...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="p-4 font-bold">Tanggal</th>
                  <th className="p-4 font-bold">Order</th>
                  <th className="p-4 font-bold">Pelanggan</th>
                  <th className="p-4 font-bold">Paket</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => {
                  const cfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.pending;
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-800 text-sm flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5 text-[#114C2A]" />{formatDate(log.delivery_date)}</p>
                        <p className="text-xs text-slate-400">Hari {log.delivery_day}/{log.total_days}</p>
                      </td>
                      <td className="p-4 font-bold text-[#114C2A] text-sm">{log.order_id}</td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800 text-sm">{log.customer_name}</p>
                        <p className="text-xs text-slate-400">{log.customer_phone}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800 text-sm">{log.package_name}</p>
                        <p className="text-xs text-slate-400">{log.duration} · {log.meal_type}</p>
                        {getMealSlots(log.meal_type).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {getMealSlots(log.meal_type).map(slot => {
                              const customMenu = log.custom_menus?.[slot];
                              const defaultMenu = log.default_menus?.[slot];
                              const title = customMenu?.title || defaultMenu?.title;
                              if (!title) return null;
                              return (
                                <div key={slot} className="text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1">
                                  <span className="font-black text-slate-400">{MEAL_SLOT_LABELS[slot]}:</span> {title}
                                  {customMenu && <span className="ml-1 text-[#114C2A] font-black">Custom</span>}
                                  {customMenu?.original_menu_title && <p className="text-slate-400">Default: {customMenu.original_menu_title}</p>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.color} ${cfg.bg}`}>
                          <StatusIcon className="w-3 h-3" /> {cfg.label}
                        </span>
                        {log.recipient_status === 'confirmed' && <p className="text-[10px] font-bold text-emerald-600 mt-1">Penerima: {log.receiver_name || 'Dikonfirmasi'}</p>}
                      </td>
                      <td className="p-4 text-right">
                        <select
                          value={log.status}
                          disabled={updatingId === log._id || log.status === 'received'}
                          onChange={(e) => updateStatus(log, e.target.value)}
                          className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#F9A826] disabled:opacity-50"
                        >
                          {Object.entries(STATUS_CONFIG).filter(([key]) => key !== 'received').map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-semibold">Belum ada log pengiriman.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
