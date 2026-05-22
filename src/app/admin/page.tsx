"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Utensils, Package, Beef, ArrowUpRight, TrendingUp, Receipt, Clock, CheckCircle2, Truck, Loader2 } from 'lucide-react';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;

interface TransactionStats {
  total: number;
  pending: number;
  confirmed: number;
  processing: number;
  delivered: number;
  cancelled: number;
  total_revenue: number;
}

interface Transaction {
  _id: string;
  order_id: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:    { label: 'Menunggu',     color: 'text-amber-600',   bg: 'bg-amber-50',   icon: Clock },
  confirmed:  { label: 'Dikonfirmasi', color: 'text-blue-600',    bg: 'bg-blue-50',    icon: CheckCircle2 },
  processing: { label: 'Diproses',     color: 'text-violet-600',  bg: 'bg-violet-50',  icon: Loader2 },
  delivered:  { label: 'Terkirim',     color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Truck },
  cancelled:  { label: 'Dibatalkan',   color: 'text-red-500',     bg: 'bg-red-50',     icon: Clock },
};

function formatCurrency(val: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const stats = [
  { name: 'Total Aktif Pelanggan', value: '142', icon: Users, change: '+12%', trend: 'up' },
  { name: 'Katalog Menu Aktif', value: '25', icon: Utensils, change: '+2', trend: 'up' },
  { name: 'Jenis Paket Berlangganan', value: '3', icon: Package, change: '0', trend: 'neutral' },
  { name: 'Macam Bahan Baku', value: '48', icon: Beef, change: '-3%', trend: 'down' },
];

export default function AdminDashboard() {
  const [txnStats, setTxnStats] = useState<TransactionStats | null>(null);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchData() {
      try {
        const token = localStorage.getItem('nutrilicious_admin_token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const [statsRes, txnRes] = await Promise.all([
          fetch(`${API_URL}/transactions/stats`, { signal: controller.signal, headers }),
          fetch(`${API_URL}/transactions/`, { signal: controller.signal, headers }),
        ]);
        if (statsRes.ok) setTxnStats(await statsRes.json());
        if (txnRes.ok) {
          const all = await txnRes.json();
          setRecentTxns(all.slice(0, 5));
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Failed to fetch transaction data:', err);
      }
    }
    fetchData();
    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-[#114C2A] tracking-tight">Dashboard Overview</h1>
        <p className="text-slate-500 mt-1">Ringkasan performa sistem katering dan inventaris Anda hari ini.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#114C2A]/5 to-[#F9A826]/10 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0 transition-transform group-hover:scale-110"/>
              
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500 mb-1">{stat.name}</p>
                  <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{stat.value}</h3>
                </div>
                <div className="w-12 h-12 bg-[#f2f6f4] rounded-2xl flex items-center justify-center text-[#114C2A]">
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              
              <div className="relative z-10 mt-4 flex items-center text-sm font-semibold">
                {stat.trend === 'up' && (
                  <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" /> {stat.change}
                  </span>
                )}
                {stat.trend === 'down' && (
                  <span className="text-red-600 bg-red-50 px-2 py-1 rounded-md flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 rotate-180 transform" /> {stat.change}
                  </span>
                )}
                {stat.trend === 'neutral' && (
                  <span className="text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                    {stat.change}
                  </span>
                )}
                <span className="text-slate-400 ml-2 font-medium">Bulan ini</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transaction Revenue + Stats Row */}
      {txnStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-gradient-to-r from-[#114C2A] to-[#1a663a] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-6 -mt-6" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/60">Total Pendapatan Aktif</p>
                  <p className="text-3xl font-black tracking-tight">{formatCurrency(txnStats.total_revenue)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-2">
                <div className="bg-white/10 backdrop-blur rounded-xl px-3 py-2">
                  <p className="text-[10px] font-bold text-white/50 uppercase">Total</p>
                  <p className="text-lg font-black">{txnStats.total}</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl px-3 py-2">
                  <p className="text-[10px] font-bold text-amber-300/80 uppercase">Pending</p>
                  <p className="text-lg font-black">{txnStats.pending}</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl px-3 py-2">
                  <p className="text-[10px] font-bold text-emerald-300/80 uppercase">Terkirim</p>
                  <p className="text-lg font-black">{txnStats.delivered}</p>
                </div>
              </div>
            </div>
          </div>

          <Link href="/admin/transactions" className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Transaksi</h3>
              <span className="text-sm font-bold text-[#114C2A] bg-[#f2f6f4] px-3 py-1.5 rounded-lg flex items-center gap-1 group-hover:bg-[#e2eae4] transition-colors">
                Lihat <ArrowUpRight className="w-4 h-4" />
              </span>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Menunggu Konfirmasi', count: txnStats.pending, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Sedang Diproses', count: txnStats.processing, color: 'text-violet-600', bg: 'bg-violet-50' },
                { label: 'Sudah Terkirim', count: txnStats.delivered, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-slate-500">{item.label}</span>
                  <span className={`text-sm font-black ${item.color} ${item.bg} px-2 py-0.5 rounded-md`}>{item.count}</span>
                </div>
              ))}
            </div>
          </Link>
        </div>
      )}

      {/* Bottom Row: Prediction Chart + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 min-h-[400px] flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
                <TrendingUp className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Grafik Prediksi Pemakaian Bahan</h3>
            <p className="text-slate-500 max-w-sm mt-2 text-sm leading-relaxed">
                Visualisasi Random Forest untuk prediksi jumlah bahan baku (gramasi) akan muncul di sini setelah model diintegrasikan.
            </p>
        </div>
        
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
           <div className="flex items-center justify-between mb-6">
               <h3 className="text-lg font-bold text-slate-800">Pesanan Terbaru</h3>
               <Link href="/admin/transactions" className="text-sm font-bold text-[#114C2A] bg-[#f2f6f4] px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#e2eae4] transition-colors">
                   Lihat <ArrowUpRight className="w-4 h-4" />
               </Link>
           </div>
           
           <div className="space-y-3">
               {recentTxns.length > 0 ? recentTxns.map((txn, idx) => {
                 const cfg = STATUS_CONFIG[txn.status] || STATUS_CONFIG['pending'];
                 const StatusIcon = cfg.icon;
                 return (
                   <div key={txn._id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-default border border-transparent hover:border-gray-50">
                       <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-[#f2f6f4] rounded-lg flex items-center justify-center text-[#114C2A] font-black text-xs">
                               {txn.order_id.split('-').pop()}
                           </div>
                           <div>
                               <p className="font-bold text-slate-700 text-sm">{txn.customer_name}</p>
                               <p className="text-xs font-semibold text-slate-400">{formatDate(txn.created_at)}</p>
                           </div>
                       </div>
                       <div className="text-right">
                           <p className="font-bold text-sm text-slate-800">{formatCurrency(txn.total)}</p>
                           <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${cfg.color}`}>
                             <StatusIcon className="w-2.5 h-2.5" />{cfg.label}
                           </span>
                       </div>
                   </div>
                 );
               }) : (
                 <div className="py-8 text-center text-slate-400 text-sm font-medium">
                   Belum ada pesanan.
                 </div>
               )}
           </div>
        </div>
      </div>
    </div>
  );
}
