"use client";

import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ''}/api`;
const ITEMS_PER_PAGE = 15;

interface UserTransactionSummary {
  id: string;
  order_id: string;
  status: string;
  total: number;
  paid_amount: number;
  created_at: string;
}

interface UserRecap {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  is_verified: boolean;
  created_at: string;
  total_transactions: number;
  total_spent: number;
  average_spent: number;
  last_order_at: string | null;
  favorite_package: string;
  customer_status: string;
  customer_status_label: string;
  transactions: UserTransactionSummary[];
}

interface RecapStats {
  total_users: number;
  verified_users: number;
  unverified_users: number;
  users_with_transactions: number;
  users_without_transactions: number;
  total_transactions: number;
  total_spent: number;
  average_spent_per_user: number;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new: { label: 'User Baru', className: 'bg-slate-100 text-slate-600' },
  active: { label: 'User Aktif', className: 'bg-emerald-50 text-emerald-700' },
  loyal: { label: 'User Loyal', className: 'bg-amber-50 text-amber-700' },
  inactive: { label: 'User Pasif', className: 'bg-red-50 text-red-600' },
  regular: { label: 'User Reguler', className: 'bg-blue-50 text-blue-700' },
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Belum Bayar',
  pending: 'Menunggu',
  confirmed: 'Dikonfirmasi',
  processing: 'Diproses',
  delivered: 'Terkirim',
  cancelled: 'Dibatalkan',
};

function getAdminHeaders() {
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('nutrilicious_admin_token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);
}

function formatDate(iso?: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(iso?: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function UsersRecapPage() {
  const [users, setUsers] = useState<UserRecap[]>([]);
  const [stats, setStats] = useState<RecapStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [verification, setVerification] = useState('all');
  const [customerStatus, setCustomerStatus] = useState('all');
  const [sort, setSort] = useState('spent_desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserRecap | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [verification, customerStatus, sort, startDate, endDate]);

  const buildParams = useCallback((noLimit = false) => {
    const params = new URLSearchParams();
    if (noLimit) {
      params.append('no_limit', 'true');
    } else {
      params.append('page', String(currentPage));
      params.append('limit', String(ITEMS_PER_PAGE));
    }
    if (debouncedSearch) params.append('search', debouncedSearch);
    if (verification !== 'all') params.append('verification', verification);
    if (customerStatus !== 'all') params.append('customer_status', customerStatus);
    if (sort) params.append('sort', sort);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return params;
  }, [currentPage, debouncedSearch, verification, customerStatus, sort, startDate, endDate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/users/recap?${buildParams().toString()}`, { headers: getAdminHeaders() });
      if (!res.ok) throw new Error('Gagal memuat rekapitulasi user.');
      const result = await res.json();
      setUsers(result.data || []);
      setStats(result.stats || null);
      setTotalPages(result.total_pages || 1);
      setTotalCount(result.total || 0);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data.');
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setVerification('all');
    setCustomerStatus('all');
    setSort('spent_desc');
    setStartDate('');
    setEndDate('');
  };

  const handleExportExcel = async () => {
    if (users.length === 0) return;
    setIsExporting(true);
    try {
      const res = await fetch(`${API_URL}/users/recap?${buildParams(true).toString()}`, { headers: getAdminHeaders() });
      if (!res.ok) throw new Error('Gagal mengunduh data rekap user.');
      const result = await res.json();
      const allUsers: UserRecap[] = result.data || [];
      if (allUsers.length === 0) {
        alert('Tidak ada data user untuk diekspor.');
        return;
      }

      const rows = allUsers.map((user, index) => ({
        No: index + 1,
        Nama: user.name || '-',
        Email: user.email || '-',
        'No HP': user.phone || '-',
        Alamat: user.address || '-',
        'Status Verifikasi': user.is_verified ? 'Terverifikasi' : 'Belum Verifikasi',
        'Tanggal Daftar': formatDate(user.created_at),
        'Jumlah Transaksi': user.total_transactions,
        'Total Pengeluaran': user.total_spent,
        'Rata-Rata Belanja': user.average_spent,
        'Paket/Menu Favorit': user.favorite_package || '-',
        'Transaksi Terakhir': formatDateTime(user.last_order_at),
        'Status User': user.customer_status_label,
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = Object.keys(rows[0]).map((key) => ({
        wch: Math.max(key.length + 4, 16),
      }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap User');
      XLSX.writeFile(workbook, `Rekap_User_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Gagal mengekspor rekap user.');
    } finally {
      setIsExporting(false);
    }
  };

  const statCards = [
    { label: 'Total User', value: stats?.total_users ?? 0, icon: Users, color: 'text-[#114C2A]', bg: 'bg-[#f2f6f4]' },
    { label: 'Sudah Belanja', value: stats?.users_with_transactions ?? 0, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Pengeluaran', value: formatCurrency(stats?.total_spent ?? 0), icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'User Terverifikasi', value: stats?.verified_users ?? 0, icon: ShieldCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#114C2A] tracking-tight">Rekapitulasi User</h1>
          <p className="text-slate-500 mt-1">Pantau nilai belanja, frekuensi transaksi, dan status pelanggan.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={users.length === 0 || isExporting}
            className="bg-white text-slate-700 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 border border-gray-200 transition-colors shadow-sm disabled:opacity-50"
          >
            {isExporting ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengunduh...</> : <><Download className="w-4 h-4" /> Export Excel</>}
          </button>
          <button onClick={fetchData} className="bg-[#114C2A] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#1a663a] transition-colors shadow-md">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{card.label}</p>
                  <p className="text-2xl font-black text-slate-800 mt-2">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${card.bg}`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, email, atau nomor HP..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#114C2A]/20 focus:border-[#114C2A] outline-none"
            />
          </div>
          <select value={verification} onChange={(e) => setVerification(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#114C2A]">
            <option value="all">Semua Verifikasi</option>
            <option value="verified">Terverifikasi</option>
            <option value="unverified">Belum Verifikasi</option>
          </select>
          <select value={customerStatus} onChange={(e) => setCustomerStatus(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#114C2A]">
            <option value="all">Semua Status User</option>
            <option value="new">User Baru</option>
            <option value="active">User Aktif</option>
            <option value="loyal">User Loyal</option>
            <option value="inactive">User Pasif</option>
            <option value="regular">User Reguler</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#114C2A]">
            <option value="spent_desc">Pengeluaran Tertinggi</option>
            <option value="spent_asc">Pengeluaran Terendah</option>
            <option value="transactions_desc">Transaksi Terbanyak</option>
            <option value="transactions_asc">Transaksi Tersedikit</option>
            <option value="last_order_desc">Transaksi Terbaru</option>
            <option value="registered_desc">Daftar Terbaru</option>
            <option value="registered_asc">Daftar Terlama</option>
          </select>
          <button onClick={handleResetFilters} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
            <Filter className="w-4 h-4" /> Reset
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-bold text-slate-500 space-y-1">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Tanggal Daftar Mulai</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#114C2A]" />
          </label>
          <label className="text-xs font-bold text-slate-500 space-y-1">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Tanggal Daftar Akhir</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#114C2A]" />
          </label>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-4 text-sm font-semibold">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-slate-800 flex items-center gap-2"><ArrowUpDown className="w-4 h-4" /> Data Rekap User</h2>
            <p className="text-xs text-slate-400 mt-1">Menampilkan {users.length} dari {totalCount} user</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left font-bold">User</th>
                <th className="px-5 py-3 text-left font-bold">Kontak</th>
                <th className="px-5 py-3 text-right font-bold">Total Pengeluaran</th>
                <th className="px-5 py-3 text-center font-bold">Transaksi</th>
                <th className="px-5 py-3 text-left font-bold">Favorit</th>
                <th className="px-5 py-3 text-left font-bold">Status</th>
                <th className="px-5 py-3 text-center font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Memuat data...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-slate-400">Tidak ada data user yang cocok.</td>
                </tr>
              ) : users.map((user) => {
                const status = STATUS_CONFIG[user.customer_status] || STATUS_CONFIG.regular;
                return (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 min-w-[220px]">
                      <div className="font-extrabold text-slate-800">{user.name || '-'}</div>
                      <div className="text-xs text-slate-400 mt-1">Daftar {formatDate(user.created_at)}</div>
                    </td>
                    <td className="px-5 py-4 min-w-[240px]">
                      <div className="font-semibold text-slate-700">{user.email || '-'}</div>
                      <div className="text-xs text-slate-400 mt-1">{user.phone || 'No HP belum diisi'}</div>
                    </td>
                    <td className="px-5 py-4 text-right font-black text-[#114C2A] min-w-[160px]">{formatCurrency(user.total_spent)}</td>
                    <td className="px-5 py-4 text-center">
                      <div className="font-black text-slate-800">{user.total_transactions}x</div>
                      <div className="text-xs text-slate-400">Avg {formatCurrency(user.average_spent)}</div>
                    </td>
                    <td className="px-5 py-4 min-w-[180px] text-slate-600 font-semibold">{user.favorite_package || '-'}</td>
                    <td className="px-5 py-4 min-w-[160px]">
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${status.className}`}>{status.label}</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${user.is_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-600'}`}>
                          {user.is_verified ? 'Terverifikasi' : 'Belum Verifikasi'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button onClick={() => setSelectedUser(user)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#f2f6f4] text-[#114C2A] font-bold hover:bg-[#e2eae4] transition-colors">
                        <Eye className="w-4 h-4" /> Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Halaman {currentPage} dari {totalPages}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1 || loading} className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold text-slate-600 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages || loading} className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold text-slate-600 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-[#114C2A]">{selectedUser.name || 'Detail User'}</h3>
                <p className="text-slate-500 text-sm mt-1">{selectedUser.email || '-'}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-[#f2f6f4] p-4">
                  <Wallet className="w-5 h-5 text-[#114C2A] mb-2" />
                  <p className="text-xs font-bold text-slate-500">Total Pengeluaran</p>
                  <p className="text-xl font-black text-slate-800 mt-1">{formatCurrency(selectedUser.total_spent)}</p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-4">
                  <ShoppingBag className="w-5 h-5 text-blue-600 mb-2" />
                  <p className="text-xs font-bold text-slate-500">Jumlah Transaksi</p>
                  <p className="text-xl font-black text-slate-800 mt-1">{selectedUser.total_transactions}x</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-4">
                  <Star className="w-5 h-5 text-amber-600 mb-2" />
                  <p className="text-xs font-bold text-slate-500">Favorit</p>
                  <p className="text-base font-black text-slate-800 mt-1">{selectedUser.favorite_package || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <p><span className="font-bold text-slate-500">No HP:</span> <span className="font-semibold text-slate-800">{selectedUser.phone || '-'}</span></p>
                  <p><span className="font-bold text-slate-500">Alamat:</span> <span className="font-semibold text-slate-800">{selectedUser.address || '-'}</span></p>
                </div>
                <div className="space-y-3">
                  <p><span className="font-bold text-slate-500">Tanggal Daftar:</span> <span className="font-semibold text-slate-800">{formatDate(selectedUser.created_at)}</span></p>
                  <p><span className="font-bold text-slate-500">Transaksi Terakhir:</span> <span className="font-semibold text-slate-800">{formatDateTime(selectedUser.last_order_at)}</span></p>
                  <p><span className="font-bold text-slate-500">Status:</span> <span className="font-semibold text-slate-800">{selectedUser.customer_status_label}</span></p>
                </div>
              </div>

              <div>
                <h4 className="font-black text-slate-800 mb-3 flex items-center gap-2"><UserCheck className="w-4 h-4" /> Riwayat Transaksi Aktif Terakhir</h4>
                <div className="rounded-2xl border border-gray-100 overflow-hidden">
                  {selectedUser.transactions.length === 0 ? (
                    <div className="p-5 text-center text-slate-400 text-sm">User belum memiliki transaksi aktif.</div>
                  ) : selectedUser.transactions.map((txn) => (
                    <div key={txn.id} className="p-4 border-b border-gray-100 last:border-b-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="font-black text-slate-800">{txn.order_id}</p>
                        <p className="text-xs text-slate-400">{formatDateTime(txn.created_at)} · {ORDER_STATUS_LABELS[txn.status] || txn.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-[#114C2A]">{formatCurrency(txn.paid_amount)}</p>
                        <p className="text-xs text-slate-400">Total order {formatCurrency(txn.total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
