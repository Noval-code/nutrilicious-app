"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UtensilsCrossed,
  PackageSearch,
  Beef,
  Receipt,
  CalendarDays,
  Truck,
  TrendingUp,
  LogOut,
  Menu,
  X,
  Loader2,
  BarChart3,
  CreditCard,
  Users,
} from 'lucide-react';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ''}/api`;
const ADMIN_TOKEN_KEY = 'nutrilicious_admin_token';

function getAdminToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Form login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Cek apakah sudah login sebagai admin
  useEffect(() => {
    const token = getAdminToken();
    if (token) {
      // Verifikasi token dengan /api/auth/me
      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.role === 'admin') {
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem(ADMIN_TOKEN_KEY);
          }
        })
        .catch(() => localStorage.removeItem(ADMIN_TOKEN_KEY))
        .finally(() => setIsChecking(false));
    } else {
      setIsChecking(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || 'Login gagal.');
        return;
      }

      localStorage.setItem(ADMIN_TOKEN_KEY, data.access_token);
      setIsAuthenticated(true);
    } catch {
      setLoginError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setIsAuthenticated(false);
  };

  // Loading saat cek token
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#114C2A]" />
      </div>
    );
  }

  // Halaman login admin
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a2e18] via-[#114C2A] to-[#1a663a] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#F9A826] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white font-black text-2xl">N</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">Admin Panel</h1>
            <p className="text-white/60 text-sm mt-1">Masuk untuk mengelola Nutrilicious</p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm font-semibold text-red-600">
                  {loginError}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Username</label>
                <input
                  id="admin-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#114C2A]/30 focus:border-[#114C2A] outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                <input
                  id="admin-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password admin"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#114C2A]/30 focus:border-[#114C2A] outline-none transition-all"
                />
              </div>
              <button
                id="admin-login-submit"
                type="submit"
                disabled={loginLoading}
                className="w-full bg-[#114C2A] hover:bg-[#1a663a] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              >
                {loginLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
                ) : (
                  'Masuk sebagai Admin'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Katalog Menu', href: '/admin/menus', icon: UtensilsCrossed },
    { name: 'Paket Langganan', href: '/admin/packages', icon: PackageSearch },
    { name: 'Jadwal Menu', href: '/admin/menu-schedules', icon: CalendarDays },
    { name: 'Log Pengiriman', href: '/admin/delivery-logs', icon: Truck },
    { name: 'Stok Bahan Baku', href: '/admin/materials', icon: Beef },
    { name: 'Riwayat Transaksi', href: '/admin/transactions', icon: Receipt },
    { name: 'Rekap User', href: '/admin/users-recap', icon: Users },
    { name: 'Pembayaran', href: '/admin/payment-settings', icon: CreditCard },
    { name: 'Prediksi Penjualan', href: '/admin/prediction', icon: TrendingUp },
    { name: 'Laporan Penjualan', href: '/admin/sales-reports', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">

      {/* Mobile Header */}
      <div className="md:hidden bg-[#114C2A] text-white p-4 flex justify-between items-center z-20 shadow-md">
        <div className="font-bold text-xl tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 bg-[#F9A826] rounded-lg flex items-center justify-center text-white font-black">N</div>
          Admin Panel
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-100 shadow-sm z-10
        transition-transform duration-300 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 hidden md:flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#114C2A] rounded-xl flex items-center justify-center text-[#F9A826] font-black text-xl shadow-inner border border-[#1a663a]">
            N
          </div>
          <div>
            <h1 className="font-extrabold text-[#114C2A] text-lg leading-tight uppercase tracking-wide">Nutrilicious</h1>
            <p className="text-xs font-semibold text-slate-400">Admin Workspace</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 md:py-0 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all duration-200
                  ${isActive
                    ? 'bg-[#114C2A] text-white shadow-md'
                    : 'text-slate-500 hover:bg-[#f2f6f4] hover:text-[#114C2A]'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#F9A826]' : ''}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            id="admin-logout"
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto w-full max-w-[1600px] mx-auto">
        {children}
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-0 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
