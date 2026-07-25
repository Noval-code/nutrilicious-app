"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Utensils, Moon, Check, Sparkles, Loader2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import Image from 'next/image';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ''}/api`;

interface MenuDetail {
    _id: string;
    title: string;
    items: string[];
    image_url?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    sugar?: number;
}

interface ScheduleDay {
    day_number: number;
    day_name: string;
    lunch_menu_id: string;
    dinner_menu_id: string;
    drink_menu_id: string;
    lunch_menu?: MenuDetail;
    dinner_menu?: MenuDetail;
    drink_menu?: MenuDetail;
}

interface ScheduleData {
    _id?: string;
    package_id: string;
    package_slug?: string;
    package_name?: string;
    schedule: ScheduleDay[];
    is_empty?: boolean;
}

interface PackageData {
    _id: string;
    slug: string;
    category: string;
    description: string;
}

export function MenuCatalog() {
    const [packages, setPackages] = useState<PackageData[]>([]);
    const [schedules, setSchedules] = useState<Record<string, ScheduleData>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activePackageIdx, setActivePackageIdx] = useState(0);
    const [activeDayIdx, setActiveDayIdx] = useState(0);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Fetch packages
            const pkgRes = await fetch(`${API_URL}/packages/`);
            if (!pkgRes.ok) throw new Error('Gagal memuat data paket');
            const pkgData: PackageData[] = await pkgRes.json();
            setPackages(pkgData);

            // 2. Fetch schedules for each package (with populated menu details)
            const scheduleMap: Record<string, ScheduleData> = {};
            await Promise.all(
                pkgData.map(async (pkg) => {
                    try {
                        const schRes = await fetch(`${API_URL}/schedules/${pkg._id}?populate=true`);
                        if (schRes.ok) {
                            scheduleMap[pkg._id] = await schRes.json();
                        }
                    } catch {
                        // Skip if schedule not available
                    }
                })
            );
            setSchedules(scheduleMap);
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan saat memuat data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Reset day index when switching packages
    useEffect(() => {
        setActiveDayIdx(0);
    }, [activePackageIdx]);

    const activePackage = packages[activePackageIdx];
    const activeSchedule = activePackage ? schedules[activePackage._id] : null;
    const days = activeSchedule?.schedule || [];
    const activeDay = days[activeDayIdx];
    const hasSchedule = activeSchedule && !activeSchedule.is_empty && days.length > 0;

    // Collect all menus for the active day
    const dayMenus: { label: string; icon: React.ReactNode; color: string; menu?: MenuDetail }[] = activeDay ? [
        { label: 'Lunch', icon: <Utensils className="w-4 h-4" />, color: '#114C2A', menu: activeDay.lunch_menu },
        { label: 'Dinner', icon: <Moon className="w-4 h-4" />, color: '#5B21B6', menu: activeDay.dinner_menu },
    ] : [];

    const goToPrevDay = () => setActiveDayIdx(prev => Math.max(0, prev - 1));
    const goToNextDay = () => setActiveDayIdx(prev => Math.min(days.length - 1, prev + 1));

    return (
        <section className="w-full relative py-20 bg-white overflow-hidden" id="menu-catalog">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#f2f6f4] to-transparent z-0"></div>
            <div className="absolute -left-32 top-32 w-80 h-80 bg-[#F9A826]/10 rounded-full blur-[80px] z-0"></div>
            <div className="absolute -right-32 top-96 w-96 h-96 bg-[#114C2A]/5 rounded-full blur-[100px] z-0"></div>

            <div className="container relative mx-auto px-4 md:px-6 z-10">
                {/* Section Header */}
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <span className="inline-flex items-center gap-2 bg-[#114C2A]/10 text-[#114C2A] px-4 py-1.5 rounded-full text-sm font-bold tracking-wide mb-4 uppercase">
                        <Sparkles className="w-4 h-4" /> Pilihan Menu Kami
                    </span>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-800 tracking-tight leading-tight">
                        Eksplorasi Rasa <span className="text-[#114C2A]">Setiap Hari</span>
                    </h2>
                    <p className="mt-5 text-slate-500 text-lg">
                        Lihat jadwal menu harian dari setiap paket berlangganan kami. Disusun oleh chef dan ahli gizi untuk memastikan variasi rasa yang tidak pernah membosankan.
                    </p>
                </div>

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center mb-8 max-w-md mx-auto">
                        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                        <p className="text-red-600 font-bold mb-1">Gagal memuat menu</p>
                        <p className="text-red-400 text-sm mb-4">{error}</p>
                        <button
                            onClick={fetchData}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-100 text-red-700 rounded-xl font-bold text-sm hover:bg-red-200 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" /> Coba Lagi
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-[#114C2A] animate-spin" />
                        <p className="text-slate-500 font-medium">Memuat jadwal menu...</p>
                    </div>
                )}

                {/* Main Content */}
                {!loading && !error && packages.length > 0 && (
                    <>
                        {/* Package Tabs */}
                        <div className="flex flex-wrap justify-center gap-3 mb-10">
                            {packages.map((pkg, idx) => {
                                const isActive = idx === activePackageIdx;
                                return (
                                    <button
                                        key={pkg._id}
                                        onClick={() => setActivePackageIdx(idx)}
                                        className={`flex items-center gap-2.5 px-7 py-4 rounded-2xl font-bold transition-all duration-300 ${
                                            isActive
                                                ? 'bg-[#114C2A] text-white shadow-[0_8px_20px_rgba(17,76,42,0.3)] scale-105'
                                                : 'bg-white text-slate-600 border border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                                        }`}
                                    >
                                        {pkg.category}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Package Description */}
                        {activePackage && (
                            <div className="text-center mb-10">
                                <p className="text-slate-500 text-base max-w-2xl mx-auto font-medium leading-relaxed">
                                    {activePackage.description}
                                </p>
                            </div>
                        )}

                        {/* Schedule Content */}
                        {hasSchedule ? (
                            <div className="max-w-5xl mx-auto">
                                {/* Day Navigation */}
                                <div className="flex items-center justify-center gap-3 mb-10">
                                    <button
                                        onClick={goToPrevDay}
                                        disabled={activeDayIdx === 0}
                                        className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-slate-400 hover:text-[#114C2A] hover:border-[#114C2A]/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>

                                    <div className="flex overflow-x-auto gap-2 scrollbar-hide px-2 py-1">
                                        {days.map((day, idx) => {
                                            const isActive = idx === activeDayIdx;
                                            const hasLunch = !!day.lunch_menu;
                                            const hasDinner = !!day.dinner_menu;
                                            const hasAnyMenu = hasLunch || hasDinner;

                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => setActiveDayIdx(idx)}
                                                    className={`relative flex-shrink-0 flex flex-col items-center px-4 py-3 rounded-2xl font-bold transition-all duration-300 min-w-[80px] ${
                                                        isActive
                                                            ? 'bg-[#114C2A] text-white shadow-lg scale-105'
                                                            : hasAnyMenu
                                                                ? 'bg-white text-slate-600 border border-gray-100 hover:bg-gray-50'
                                                                : 'bg-gray-50 text-slate-300 border border-gray-100 cursor-not-allowed'
                                                    }`}
                                                >
                                                    <span className="text-xs font-medium opacity-70">Hari {day.day_number}</span>
                                                    <span className="text-sm">{day.day_name}</span>
                                                    {/* Indicator dots */}
                                                    <div className="flex gap-1 mt-1.5">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${hasLunch ? (isActive ? 'bg-[#F9A826]' : 'bg-[#114C2A]') : 'bg-gray-200'}`} />
                                                        <span className={`w-1.5 h-1.5 rounded-full ${hasDinner ? (isActive ? 'bg-purple-300' : 'bg-purple-400') : 'bg-gray-200'}`} />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={goToNextDay}
                                        disabled={activeDayIdx === days.length - 1}
                                        className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-slate-400 hover:text-[#114C2A] hover:border-[#114C2A]/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Day Header */}
                                {activeDay && (
                                    <div className="text-center mb-8">
                                        <div className="inline-flex items-center gap-2 bg-[#f2f6f4] text-[#114C2A] px-5 py-2 rounded-full text-sm font-bold border border-[#e2eae4]">
                                            <Calendar className="w-4 h-4" />
                                            {activeDay.day_name} — Hari ke-{activeDay.day_number}
                                        </div>
                                    </div>
                                )}

                                {/* Menu Cards Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {dayMenus.map((slot, idx) => (
                                        <div
                                            key={idx}
                                            className={`bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col h-full transform hover:-translate-y-1 relative overflow-hidden ${
                                                !slot.menu ? 'opacity-50' : ''
                                            }`}
                                        >
                                            {/* Card Accent */}
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#114C2A]/5 to-[#F9A826]/10 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0" />

                                            {/* Category Label */}
                                            <div className="flex items-center gap-2 mb-4 z-10 relative">
                                                <div
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                                                    style={{ backgroundColor: `${slot.color}15`, color: slot.color }}
                                                >
                                                    {slot.icon}
                                                </div>
                                                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: slot.color }}>
                                                    {slot.label}
                                                </span>
                                            </div>

                                            {slot.menu ? (
                                                <>
                                                    {/* Menu Image */}
                                                    {slot.menu.image_url && (
                                                        <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-4 z-10">
                                                            <Image
                                                                src={slot.menu.image_url}
                                                                alt={slot.menu.title}
                                                                fill
                                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                                sizes="(max-width: 768px) 100vw, 33vw"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Menu Title */}
                                                    <h3 className="text-lg font-extrabold text-slate-800 mb-2 leading-snug z-10 relative pr-4">
                                                        {slot.menu.title}
                                                    </h3>

                                                    {/* Nutrition facts */}
                                                    {(slot.menu.calories !== undefined || slot.menu.protein !== undefined) && (
                                                        <div className="flex flex-wrap gap-1.5 mb-3 z-10 relative text-[11px] font-bold">
                                                            {slot.menu.calories ? (
                                                                <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                                                                    🔥 {slot.menu.calories} kcal
                                                                </span>
                                                            ) : null}
                                                            {slot.menu.protein ? (
                                                                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg">
                                                                    Protein: {slot.menu.protein}g
                                                                </span>
                                                            ) : null}
                                                            {slot.menu.carbs ? (
                                                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg">
                                                                    Karbo: {slot.menu.carbs}g
                                                                </span>
                                                            ) : null}
                                                            {slot.menu.fat ? (
                                                                <span className="bg-pink-50 text-pink-700 px-2 py-0.5 rounded-lg">
                                                                    Lemak: {slot.menu.fat}g
                                                                </span>
                                                            ) : null}
                                                            {slot.menu.sugar ? (
                                                                <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg">
                                                                    Gula: {slot.menu.sugar}g
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    )}

                                                    <div className="w-8 h-1 bg-[#F9A826] rounded-full mb-4 transition-all group-hover:w-16"></div>
                                                </>
                                            ) : (
                                                <div className="flex-1 flex flex-col items-center justify-center py-8 text-slate-300 z-10 relative">
                                                    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                                                        {slot.icon}
                                                    </div>
                                                    <p className="text-sm font-semibold">Belum ada menu</p>
                                                    <p className="text-xs mt-1">Menu belum diatur</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* No schedule set */
                            <div className="text-center py-16 text-slate-400 max-w-md mx-auto">
                                <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
                                    <Calendar className="w-10 h-10 text-gray-300" />
                                </div>
                                <p className="font-bold text-lg text-slate-500">Jadwal belum tersedia</p>
                                <p className="text-sm mt-2 leading-relaxed">
                                    Jadwal menu untuk paket <strong>{activePackage?.category}</strong> belum diatur oleh admin.
                                </p>
                            </div>
                        )}



                    </>
                )}

                {/* Empty packages state */}
                {!loading && !error && packages.length === 0 && (
                    <div className="text-center py-16 text-slate-400">
                        <p className="font-bold text-lg">Belum ada paket tersedia</p>
                        <p className="text-sm mt-1">Paket berlangganan sedang dalam persiapan.</p>
                    </div>
                )}
            </div>
        </section>
    );
}
