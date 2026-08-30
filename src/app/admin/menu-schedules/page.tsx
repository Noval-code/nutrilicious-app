"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  UtensilsCrossed,
  X,
} from 'lucide-react';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ''}/api`;

const DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

interface MenuItem {
  _id: string;
  title: string;
  category: string;
  items: string[];
  image_url?: string;
}

interface MenuCategory {
  _id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

interface ScheduleDay {
  day_number: number;
  day_name: string;
  lunch_menu_id?: string;
  dinner_menu_id?: string;
  category_menu_ids?: Record<string, string>;
  lunch_menu?: { _id: string; title: string; items: string[]; image_url?: string };
  dinner_menu?: { _id: string; title: string; items: string[]; image_url?: string };
  category_details?: Record<string, { _id: string; title: string; items: string[]; image_url?: string }>;
}

interface Schedule {
  _id?: string;
  package_id: string;
  package_slug?: string;
  package_name?: string;
  schedule: ScheduleDay[];
  is_empty?: boolean;
  updated_at?: string;
}

interface PackageData {
  _id: string;
  slug: string;
  name: string;
  description: string;
}

export default function MenuSchedulesPage() {
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [scheduleMap, setScheduleMap] = useState<Record<string, Schedule>>({});
  const [loading, setLoading] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch packages, menus, schedules, and categories
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [pkgRes, menuRes, schedRes, catRes] = await Promise.all([
        fetch(`${API_URL}/packages/`),
        fetch(`${API_URL}/menus/`),
        fetch(`${API_URL}/schedules/`),
        fetch(`${API_URL}/menu-categories/?active_only=true`),
      ]);

      if (pkgRes.ok) setPackages(await pkgRes.json());
      if (menuRes.ok) setMenus(await menuRes.json());
      if (catRes.ok) setCategories(await catRes.json());
      if (schedRes.ok) {
        const allSchedules: Schedule[] = await schedRes.json();
        const map: Record<string, Schedule> = {};
        allSchedules.forEach(s => {
          map[s.package_id] = s;
        });
        setScheduleMap(map);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Auto-hide success message
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Active categories fallback
  const activeCategories: { name: string; slug: string }[] = categories.length > 0
    ? categories
    : [
        { name: 'Lunch', slug: 'lunch' },
        { name: 'Dinner', slug: 'dinner' },
      ];

  // Load schedule for selected package
  const selectPackage = useCallback(async (pkgId: string) => {
    setSelectedPackageId(pkgId);
    setHasChanges(false);
    setError(null);

    try {
      setLoadingSchedule(true);
      const res = await fetch(`${API_URL}/schedules/${pkgId}?populate=true`);
      if (res.ok) {
        const data: Schedule = await res.json();
        setSchedule(data.schedule);
      }
    } catch (err: any) {
      setError('Gagal memuat jadwal menu');
    } finally {
      setLoadingSchedule(false);
    }
  }, []);

  const getDayCategoryMenuId = (day: ScheduleDay, catSlug: string): string => {
    if (day.category_menu_ids?.[catSlug]) return day.category_menu_ids[catSlug];
    if (catSlug === 'lunch' && day.lunch_menu_id) return day.lunch_menu_id;
    if (catSlug === 'dinner' && day.dinner_menu_id) return day.dinner_menu_id;
    return '';
  };

  // Update schedule day for a dynamic category
  const updateDayCategoryMenu = (dayIndex: number, catSlug: string, value: string) => {
    setSchedule(prev => {
      const updated = [...prev];
      const day = updated[dayIndex];
      const catMenuIds = { ...(day.category_menu_ids || {}) };
      catMenuIds[catSlug] = value;

      let lunchId = day.lunch_menu_id;
      let dinnerId = day.dinner_menu_id;
      if (catSlug === 'lunch') lunchId = value;
      if (catSlug === 'dinner') dinnerId = value;

      updated[dayIndex] = {
        ...day,
        lunch_menu_id: lunchId,
        dinner_menu_id: dinnerId,
        category_menu_ids: catMenuIds,
      };
      return updated;
    });
    setHasChanges(true);
  };

  // Save schedule
  const handleSave = async () => {
    if (!selectedPackageId) return;

    try {
      setSaving(true);
      setError(null);

      const res = await fetch(`${API_URL}/schedules/${selectedPackageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menyimpan jadwal');
      }

      const savedData = await res.json();

      // Update local schedule map
      setScheduleMap(prev => ({
        ...prev,
        [selectedPackageId]: savedData,
      }));

      setSchedule(savedData.schedule);
      setHasChanges(false);
      setSuccessMsg('Jadwal menu berhasil disimpan!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedPkg = packages.find(p => p._id === selectedPackageId);

  // Check if schedule is complete for active categories
  const isScheduleComplete = (pkgId: string) => {
    const s = scheduleMap[pkgId];
    if (!s || !s.schedule || s.schedule.length === 0) return false;
    return s.schedule.every(day => {
      return activeCategories.every(cat => !!getDayCategoryMenuId(day, cat.slug));
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-[#114C2A] tracking-tight">Jadwal Menu</h1>
        <p className="text-slate-500 mt-1">Atur jadwal menu 6 hari (Senin–Sabtu) untuk setiap paket langganan secara dinamis.</p>
      </div>

      {/* Success Message */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-sm font-bold animate-in fade-in duration-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm font-bold animate-in fade-in duration-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#114C2A] animate-spin" />
          <span className="ml-3 text-slate-500 font-medium">Memuat data...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Package Selector */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Pilih Paket</h2>
            {packages.map(pkg => {
              const isSelected = selectedPackageId === pkg._id;
              const isComplete = isScheduleComplete(pkg._id);
              return (
                <button
                  key={pkg._id}
                  onClick={() => selectPackage(pkg._id)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 group ${
                    isSelected
                      ? 'border-[#114C2A] bg-[#114C2A]/5 shadow-md'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-sm ${isSelected ? 'text-[#114C2A]' : 'text-slate-800'}`}>
                        {pkg.name}
                      </h3>
                      <p className="text-xs text-slate-400 truncate">{pkg.description}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {isComplete ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                          <CheckCircle2 className="w-3 h-3" /> Set
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                          Belum
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {packages.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-sm">
                Belum ada paket. Buat paket terlebih dahulu.
              </div>
            )}
          </div>

          {/* Right: Schedule Editor */}
          <div className="lg:col-span-8">
            {!selectedPackageId ? (
              <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4">
                  <CalendarDays className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">Pilih Paket</h3>
                <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
                  Pilih paket di sebelah kiri untuk mulai mengatur jadwal menu harian.
                </p>
              </div>
            ) : loadingSchedule ? (
              <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
                <Loader2 className="w-8 h-8 text-[#114C2A] animate-spin mx-auto" />
                <p className="text-slate-500 text-sm mt-3">Memuat jadwal...</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-[#114C2A] to-[#1a663a]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <h2 className="text-lg font-extrabold text-white">{selectedPkg?.name}</h2>
                        <p className="text-white/60 text-xs">Jadwal menu 6 hari (Senin–Sabtu)</p>
                      </div>
                    </div>
                    {hasChanges && (
                      <span className="text-xs font-bold text-amber-300 bg-amber-300/15 px-3 py-1 rounded-lg">
                        Belum disimpan
                      </span>
                    )}
                  </div>
                </div>

                {/* Info Banner */}
                <div className="px-6 pt-4">
                  <div className="bg-blue-50 border border-blue-100 text-blue-700 p-3 rounded-xl text-xs font-medium flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      Schedule 6 hari ini menjadi <strong>template dasar</strong>. Paket 5 hari ambil Day 1–5, 
                      paket 10 hari = siklus ini diulang, paket 30 hari = 5× siklus.
                    </div>
                  </div>
                </div>

                {/* Schedule Grid */}
                <div className="p-6 space-y-3">
                  {schedule.map((day, idx) => {
                    const isDayComplete = activeCategories.every(cat => !!getDayCategoryMenuId(day, cat.slug));

                    return (
                      <div key={day.day_number} className="border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 transition-colors">
                        {/* Day Header */}
                        <div className="bg-slate-50 px-4 py-2.5 border-b border-gray-100 flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-[#114C2A] text-white text-xs font-black flex items-center justify-center">
                            {day.day_number}
                          </span>
                          <span className="font-bold text-sm text-slate-700">{day.day_name}</span>
                          {isDayComplete ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
                          ) : (
                            <span className="ml-auto text-[10px] font-bold text-amber-500">Belum lengkap</span>
                          )}
                        </div>

                        {/* Menu Selectors per Active Dynamic Category */}
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {activeCategories.map(cat => {
                            const selectedMenuId = getDayCategoryMenuId(day, cat.slug);
                            const categoryMenus = menus.filter(m => m.category === cat.slug);
                            const selectedMenu = menus.find(m => m._id === selectedMenuId);

                            return (
                              <div key={cat.slug}>
                                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2 capitalize">
                                  <UtensilsCrossed className="w-3.5 h-3.5 text-amber-500" />
                                  Menu {cat.name}
                                </label>
                                <div className="relative">
                                  <select
                                    value={selectedMenuId}
                                    onChange={(e) => updateDayCategoryMenu(idx, cat.slug, e.target.value)}
                                    className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F9A826] focus:border-transparent cursor-pointer hover:border-gray-300 transition-colors"
                                  >
                                    <option value="">— Pilih Menu {cat.name} —</option>
                                    {categoryMenus.map(m => (
                                      <option key={m._id} value={m._id}>{m.title}</option>
                                    ))}
                                    {/* Fallback if menu in another category is selected */}
                                    {selectedMenu && !categoryMenus.some(m => m._id === selectedMenu._id) && (
                                      <option value={selectedMenu._id}>{selectedMenu.title}</option>
                                    )}
                                  </select>
                                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                                {selectedMenuId && selectedMenu && (
                                  <p className="text-[10px] text-slate-400 mt-1.5 pl-1">
                                    {selectedMenu.items?.join(' • ') || ''}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer: Save Button */}
                <div className="p-6 border-t border-gray-100 bg-slate-50 flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Template ini berlaku untuk semua durasi paket <strong>{selectedPkg?.name}</strong>.
                  </p>
                  <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className="bg-[#114C2A] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#1a663a] transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                    ) : (
                      <><Save className="w-4 h-4" /> Simpan Jadwal</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
