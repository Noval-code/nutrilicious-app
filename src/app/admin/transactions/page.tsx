"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Eye, RefreshCw, ChevronDown, ChevronLeft, ChevronRight, X, Clock, CheckCircle2, Truck, XCircle, Loader2, Receipt, ArrowUpDown, CreditCard, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ''}/api`;

interface TransactionItem {
  package_name: string;
  duration: string;
  meal_type: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface Transaction {
  _id: string;
  order_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_lat?: number;
  customer_lng?: number;
  customer_notes: string;
  items: TransactionItem[];
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  xendit_invoice_url: string;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  pending: number;
  confirmed: number;
  processing: number;
  delivered: number;
  cancelled: number;
  total_revenue: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending_payment: { label: 'Belum Bayar', color: 'text-orange-600', bg: 'bg-orange-50', icon: CreditCard },
  pending:    { label: 'Menunggu',   color: 'text-amber-600',   bg: 'bg-amber-50',   icon: Clock },
  confirmed:  { label: 'Dikonfirmasi', color: 'text-blue-600',  bg: 'bg-blue-50',    icon: CheckCircle2 },
  processing: { label: 'Diproses',   color: 'text-violet-600', bg: 'bg-violet-50',  icon: Loader2 },
  delivered:  { label: 'Terkirim',   color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Truck },
  cancelled:  { label: 'Dibatalkan', color: 'text-red-500',     bg: 'bg-red-50',     icon: XCircle },
};

function formatCurrency(val: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 15;

  // Debounce search agar tidak fetch setiap ketikan huruf
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset ke halaman 1 saat search berubah
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset ke halaman 1 saat filter/sort berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, sortOrder]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(currentPage));
      params.append('limit', String(ITEMS_PER_PAGE));
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);
      params.append('sort', sortOrder);

      const [txnRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/transactions/?${params.toString()}`),
        fetch(`${API_URL}/transactions/stats`),
      ]);
      if (txnRes.ok) {
        const result = await txnRes.json();
        setTransactions(result.data || []);
        setTotalPages(result.total_pages || 1);
        setTotalCount(result.total || 0);
      }
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.error('Gagal memuat data transaksi:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, filterStatus, sortOrder]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`${API_URL}/transactions/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTransactions(prev => prev.map(t => t._id === id ? updated : t));
        if (selectedTxn?._id === id) setSelectedTxn(updated);
        // Refresh stats
        const statsRes = await fetch(`${API_URL}/transactions/stats`);
        if (statsRes.ok) setStats(await statsRes.json());
      }
    } catch (err) {
      console.error('Gagal update status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleExportExcel = async () => {
    if (transactions.length === 0) return;
    setIsExporting(true);

    try {
      const params = new URLSearchParams();
      params.append('no_limit', 'true');
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (filterStatus && filterStatus !== 'all') params.append('status', filterStatus);
      params.append('sort', sortOrder);

      const res = await fetch(`${API_URL}/transactions/?${params.toString()}`);
      if (!res.ok) throw new Error('Gagal mengunduh data transaksi');

      const result = await res.json();
      const allTxns: Transaction[] = result.data || [];

      if (allTxns.length === 0) {
        alert("Tidak ada transaksi untuk diekspor");
        return;
      }

      const dataToExport = allTxns.map(txn => {
        const statusLabel = STATUS_CONFIG[txn.status]?.label || txn.status;
        const itemsString = txn.items.map(item => `${item.package_name} (${item.duration} - ${item.meal_type}) x${item.quantity}`).join('; ');
        const hasCoordinates = typeof txn.customer_lat === 'number' && typeof txn.customer_lng === 'number';
        const gmapsLink = hasCoordinates
          ? `https://www.google.com/maps?q=${txn.customer_lat},${txn.customer_lng}`
          : '';

        return {
          'Order ID': txn.order_id,
          'Tanggal': formatDate(txn.created_at),
          'Nama Pelanggan': txn.customer_name,
          'Nomor Telepon': txn.customer_phone,
          'Alamat Pengiriman': txn.customer_address || '-',
          'Link Google Maps': gmapsLink,
          'Catatan': txn.customer_notes || '-',
          'Item Pesanan': itemsString,
          'Total Pembayaran': txn.total,
          'Status Pesanan': statusLabel,
          'Metode Pembayaran': txn.payment_method || '-',
          'Status Pembayaran': txn.payment_status || '-'
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Transaksi');

      // Auto-fit columns
      const maxLens = Object.keys(dataToExport[0]).map(key => {
        let maxLen = key.length;
        dataToExport.forEach(row => {
          const val = row[key as keyof typeof row];
          if (val) {
            maxLen = Math.max(maxLen, val.toString().length);
          }
        });
        return { wch: maxLen + 3 };
      });
      worksheet['!cols'] = maxLens;

      XLSX.writeFile(workbook, `Data_Pengantaran_Transaksi_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("Gagal mengekspor data transaksi");
    } finally {
      setIsExporting(false);
    }
  };

  const statusCards = [
    { key: 'pending_payment', count: stats?.pending ?? 0 },
    { key: 'confirmed', count: stats?.confirmed ?? 0 },
    { key: 'processing', count: stats?.processing ?? 0 },
    { key: 'delivered', count: stats?.delivered ?? 0 },
    { key: 'cancelled', count: stats?.cancelled ?? 0 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#114C2A] tracking-tight">Riwayat Transaksi</h1>
          <p className="text-slate-500 mt-1">Pantau dan kelola seluruh pesanan pelanggan.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={transactions.length === 0 || isExporting}
            className="bg-white text-slate-700 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 border border-gray-200 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                Mengunduh...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Export Excel
              </>
            )}
          </button>
          <button onClick={fetchData} className="bg-[#114C2A] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#1a663a] transition-colors shadow-md">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statusCards.map(({ key, count }) => {
          const cfg = STATUS_CONFIG[key];
          const Icon = cfg.icon;
          const isActive = filterStatus === key;
          return (
            <button
              key={key}
              onClick={() => setFilterStatus(isActive ? 'all' : key)}
              className={`relative p-4 rounded-2xl border transition-all text-left group ${
                isActive
                  ? 'border-[#114C2A] bg-[#114C2A] text-white shadow-lg scale-[1.02]'
                  : 'border-gray-100 bg-white hover:shadow-md hover:border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-white/20' : cfg.bg}`}>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : cfg.color}`} />
                </div>
                <span className={`text-2xl font-black ${isActive ? 'text-white' : 'text-slate-800'}`}>{count}</span>
              </div>
              <p className={`text-xs font-bold ${isActive ? 'text-white/80' : 'text-slate-400'}`}>{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Revenue Banner */}
      {stats && (
        <div className="bg-gradient-to-r from-[#114C2A] to-[#1a663a] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/70">Total Pendapatan (Aktif)</p>
              <p className="text-2xl font-black tracking-tight">{formatCurrency(stats.total_revenue)}</p>
            </div>
          </div>
          <div className="text-sm font-bold text-white/60">
            {stats.total} total transaksi
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Order ID, nama, atau telepon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A826] focus:border-transparent font-medium text-slate-700"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#F9A826] appearance-none cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="pending_payment">Belum Bayar</option>
                <option value="confirmed">Dikonfirmasi</option>
                <option value="processing">Diproses</option>
                <option value="delivered">Terkirim</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              title={sortOrder === 'desc' ? 'Terbaru dulu' : 'Terlama dulu'}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="font-semibold text-sm">Memuat data transaksi...</p>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="p-4 font-bold">Order ID</th>
                  <th className="p-4 font-bold">Pelanggan</th>
                  <th className="p-4 font-bold">Item</th>
                  <th className="p-4 font-bold">Total</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold">Tanggal</th>
                  <th className="p-4 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((txn) => {
                  const cfg = STATUS_CONFIG[txn.status] || STATUS_CONFIG['pending_payment'];
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={txn._id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-4">
                        <span className="font-bold text-[#114C2A] text-sm tracking-tight">{txn.order_id}</span>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800 text-sm">{txn.customer_name}</p>
                        <p className="text-xs text-slate-400 font-medium">{txn.customer_phone}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {txn.items.slice(0, 2).map((item, i) => (
                            <span key={i} className="bg-gray-100 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded-md truncate max-w-[150px]">
                              {item.package_name || 'Paket'}
                            </span>
                          ))}
                          {txn.items.length > 2 && (
                            <span className="text-[11px] font-bold text-slate-400">+{txn.items.length - 2} lagi</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-800 text-sm">{formatCurrency(txn.total)}</span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.color} ${cfg.bg}`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-medium text-slate-500">{formatDate(txn.created_at)}</span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedTxn(txn)}
                          className="p-2 text-slate-400 hover:text-[#114C2A] bg-white hover:bg-[#f2f6f4] rounded-lg shadow-sm border border-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <Receipt className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500 font-semibold text-sm">Tidak ada transaksi ditemukan.</p>
                      <p className="text-slate-400 text-xs mt-1">Coba ubah filter atau kata kunci pencarian.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <p className="text-xs font-semibold text-slate-400">
                Menampilkan {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} dari {totalCount} transaksi
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 text-slate-500 hover:bg-white hover:text-[#114C2A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1]) > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === '...' ? (
                      <span key={`dots-${idx}`} className="px-2 text-slate-300 font-bold text-sm">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                          currentPage === p
                            ? 'bg-[#114C2A] text-white shadow-md'
                            : 'border border-gray-200 text-slate-500 hover:bg-white hover:text-[#114C2A]'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-200 text-slate-500 hover:bg-white hover:text-[#114C2A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* Detail Flyout Panel */}
      {selectedTxn && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setSelectedTxn(null)}>
          <div
            className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="font-extrabold text-xl text-slate-800">Detail Pesanan</h2>
                <p className="text-sm font-bold text-[#114C2A] mt-0.5">{selectedTxn.order_id}</p>
              </div>
              <button onClick={() => setSelectedTxn(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Status Pesanan</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    const isActive = selectedTxn.status === key;
                    return (
                      <button
                        key={key}
                        disabled={updatingStatus}
                        onClick={() => handleStatusUpdate(selectedTxn._id, key)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                          isActive
                            ? `${cfg.bg} ${cfg.color} border-current shadow-sm`
                            : 'border-gray-100 text-slate-400 hover:border-gray-200 hover:text-slate-600'
                        } ${updatingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Info Pelanggan</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400">Nama</p>
                    <p className="text-sm font-bold text-slate-800">{selectedTxn.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400">Telepon</p>
                    <p className="text-sm font-bold text-slate-800">{selectedTxn.customer_phone}</p>
                  </div>
                </div>
                {selectedTxn.customer_address && (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400">Alamat</p>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">{selectedTxn.customer_address}</p>
                  </div>
                )}
                {selectedTxn.customer_notes && (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400">Catatan</p>
                    <p className="text-sm font-medium text-slate-600 italic">{selectedTxn.customer_notes}</p>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Item Pesanan</h3>
                <div className="space-y-2">
                  {selectedTxn.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-800 truncate">{item.package_name || 'Paket'}</p>
                        <div className="flex gap-2 mt-1">
                          {item.duration && <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{item.duration}</span>}
                          {item.meal_type && <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{item.meal_type}</span>}
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-xs text-slate-400 font-semibold">{item.quantity}x</p>
                        <p className="font-bold text-sm text-slate-800">{formatCurrency(item.subtotal)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="bg-[#114C2A] text-white rounded-2xl p-4 flex items-center justify-between">
                <span className="font-bold text-sm text-white/70">Total Pembayaran</span>
                <span className="text-xl font-black tracking-tight">{formatCurrency(selectedTxn.total)}</span>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="font-semibold text-slate-400">Metode Bayar</p>
                  <p className="font-bold text-slate-700 capitalize mt-0.5">{selectedTxn.payment_method}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="font-semibold text-slate-400">Dibuat</p>
                  <p className="font-bold text-slate-700 mt-0.5">{formatDate(selectedTxn.created_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
