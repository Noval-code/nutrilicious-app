"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Utensils, UtensilsCrossed, CheckCircle2, ShoppingCart, Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ''}/api`;

const mealTypesList = ["Lunch", "Dinner", "Lunch & Dinner"];

interface PackageData {
    _id: string;
    slug: string;
    name: string;
    description: string;
    pricing: Record<string, Record<string, { normal: string; promo: string }>>;
}

export function PricingSection() {
    const [packages, setPackages] = useState<PackageData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState("5 Hari");
    const [selectedMeal, setSelectedMeal] = useState("Lunch");
    const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
    const { addItem } = useCart();

    const daysList = Array.from(new Set(packages.flatMap(pkg => Object.keys(pkg.pricing || {}))));

    const fetchPackages = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`${API_URL}/packages/`);
            if (!res.ok) throw new Error('Gagal memuat data paket');
            const data: PackageData[] = await res.json();
            setPackages(data);
            const firstDuration = data.flatMap(pkg => Object.keys(pkg.pricing || {}))[0];
            if (firstDuration) setSelectedDay(firstDuration);
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan saat memuat data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPackages();
    }, [fetchPackages]);

    const handleAddToCart = (pkg: PackageData) => {
        const pricing = pkg.pricing?.[selectedDay]?.[selectedMeal];
        if (!pricing) return;

        addItem({
            type: 'package',
            name: pkg.name,
            slug: pkg.slug,
            package_name: pkg.name,
            package_slug: pkg.slug,
            duration: selectedDay,
            meal_type: selectedMeal,
            price: pricing.promo,
        });

        // Show "added" animation
        const key = `${pkg.slug}-${selectedDay}-${selectedMeal}`;
        setAddedItems(prev => ({ ...prev, [key]: true }));
        setTimeout(() => {
            setAddedItems(prev => ({ ...prev, [key]: false }));
        }, 1500);
    };

    // Loading skeleton for package cards
    const SkeletonCard = () => (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col animate-pulse">
            <div className="flex items-start gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl bg-gray-200" />
                <div className="pt-2 flex-1">
                    <div className="h-6 bg-gray-200 rounded-lg w-3/4" />
                </div>
            </div>
            <div className="space-y-2 mb-6">
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-5/6" />
            </div>
            <div className="bg-gray-50 rounded-2xl p-5 mb-6">
                <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-10 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mt-3" />
            </div>
            <div className="h-12 bg-gray-200 rounded-xl" />
        </div>
    );

    return (
        <section id="pricing" className="w-full relative py-16 md:py-24 font-sans bg-slate-50 border-t border-gray-100">
             <div className="container mx-auto px-4 md:px-6">
                
                {/* Header Title */}
                <div className="text-center mb-12 md:mb-16">
                    <h2 className="text-[#114C2A] font-bold tracking-widest text-xs md:text-sm uppercase mb-3">
                        Pilihan Cerdas
                    </h2>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight">
                        Paket Langganan
                    </h1>
                    <p className="mt-4 text-slate-500 max-w-2xl mx-auto text-sm md:text-base">
                        Sesuaikan program nutrisimu. Pilih durasi dan waktu makan yang paling tepat untuk rutinitas harianmu.
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 md:gap-10 max-w-7xl mx-auto">
                    {/* Sidebar / Left Navigation */}
                    <div className="w-full lg:w-[280px] flex-shrink-0">
                         <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 lg:sticky lg:top-32">
                              <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2 px-2">
                                  <CalendarDays className="w-5 h-5 text-[#F9A826]" />
                                  Pilih Durasi
                               </h3>
                              {/* Horizontal scroll on mobile, vertical list on desktop */}
                              <div className="flex overflow-x-auto lg:flex-col gap-2 pb-2 lg:pb-0 scrollbar-hide -mx-2 px-2 lg:mx-0 lg:px-0">
                                   {daysList.map(day => (
                                      <button
                                          key={day}
                                          onClick={() => setSelectedDay(day)}
                                          className={`group relative flex-shrink-0 flex items-center px-4 py-3 rounded-2xl font-bold transition-all text-left w-auto lg:w-full border
                                            ${selectedDay === day 
                                                ? 'bg-[#114C2A] text-white shadow-md border-[#114C2A] lg:scale-[1.02] z-10' 
                                                : 'bg-white text-slate-500 hover:bg-gray-50 border-gray-100'
                                            }`}
                                      >   
                                          {selectedDay === day && <CheckCircle2 className="w-4 h-4 mr-2 text-[#F9A826] hidden lg:block" />}
                                          <span className="whitespace-nowrap">{day}</span>
                                      </button>
                                   ))}
                                  {daysList.length === 0 && (
                                      <div className="text-sm text-slate-400 font-semibold px-2 py-3">
                                          Belum ada durasi paket.
                                      </div>
                                  )}
                               </div>
                         </div>
                    </div>

                    {/* Right Content Area */}
                    <div className="flex-1 flex flex-col w-full">
                        
                        {/* Top Navbar for Meal Type */}
                        <div className="mb-8">
                            <div className="bg-white rounded-[24px] p-2 flex overflow-x-auto shadow-sm border border-gray-100 gap-2 w-full lg:w-fit scrollbar-hide">
                                {mealTypesList.map(meal => (
                                    <button
                                        key={meal}
                                        onClick={() => setSelectedMeal(meal)}
                                        className={`flex-shrink-0 px-6 py-3 rounded-[16px] font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap
                                            ${selectedMeal === meal 
                                                ? 'bg-[#F9A826] text-[#114C2A] shadow-sm' 
                                                : 'bg-transparent text-slate-500 hover:bg-gray-50'
                                            }`}
                                    >
                                        {meal === 'Lunch' && <Utensils className="w-4 h-4" />}
                                        {meal === 'Dinner' && <Utensils className="w-4 h-4" />}
                                        {meal === 'Lunch & Dinner' && <UtensilsCrossed className="w-4 h-4" />}
                                        {meal}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Error State */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center mb-6">
                                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                                <p className="text-red-600 font-bold mb-1">Gagal memuat paket</p>
                                <p className="text-red-400 text-sm mb-4">{error}</p>
                                <button
                                    onClick={fetchPackages}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-100 text-red-700 rounded-xl font-bold text-sm hover:bg-red-200 transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4" /> Coba Lagi
                                </button>
                            </div>
                        )}

                        {/* Loading State */}
                        {loading && (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                <SkeletonCard />
                                <SkeletonCard />
                                <SkeletonCard />
                            </div>
                        )}

                        {/* Cards Grid */}
                        {!loading && !error && (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {packages.map((pkg) => {
                                    const pricing = pkg.pricing?.[selectedDay]?.[selectedMeal];
                                    const itemKey = `${pkg.slug}-${selectedDay}-${selectedMeal}`;
                                    const justAdded = addedItems[itemKey];

                                    // Skip rendering if no pricing for this combination
                                    if (!pricing) return null;

                                    return (
                                        <div key={pkg._id} className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl border border-gray-100 flex flex-col relative group transition-all duration-300">

                                            <div className="mb-5">
                                                <h3 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight">{pkg.name}</h3>
                                            </div>
                                            
                                            <p className="text-sm text-slate-500 mb-6 flex-grow leading-relaxed font-medium">
                                                {pkg.description}
                                            </p>

                                            <div className="bg-[#fcfdfc] rounded-2xl p-5 mb-6 border border-gray-100 group-hover:border-[#d4e1d8] transition-colors relative overflow-hidden">
                                                {/* Decorative element background */}
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#114C2A]/5 to-[#F9A826]/10 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"/>
                                                
                                                <div className="relative z-10">
                                                    <div className="text-xs text-slate-400 font-semibold line-through mb-1">
                                                        Rp{pricing.normal}
                                                    </div>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-sm md:text-base font-bold text-[#114C2A]">Rp</span>
                                                        <span className="text-3xl md:text-4xl font-black text-[#114C2A] tracking-tighter">{pricing.promo}</span>
                                                    </div>
                                                    <div className="text-xs md:text-sm text-slate-500 mt-2 font-medium flex items-center gap-1">
                                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F9A826]"></span>
                                                        Untuk {selectedDay} ({selectedMeal})
                                                    </div>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => handleAddToCart(pkg)}
                                                className={`w-full py-3.5 rounded-xl font-bold shadow-md transition-all duration-300 transform group-hover:-translate-y-1 flex items-center justify-center gap-2
                                                    ${justAdded 
                                                        ? 'bg-emerald-500 text-white hover:shadow-lg' 
                                                        : 'bg-slate-900 text-white hover:bg-[#114C2A] hover:shadow-lg'
                                                    }`}
                                            >
                                                {justAdded ? (
                                                    <>
                                                        <Check className="w-5 h-5" />
                                                        Ditambahkan!
                                                    </>
                                                ) : (
                                                    <>
                                                        <ShoppingCart className="w-5 h-5" />
                                                        Langganan Sekarang
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )
                                })}

                                {packages.length > 0 && !packages.some(pkg => pkg.pricing?.[selectedDay]?.[selectedMeal]) && (
                                    <div className="col-span-full text-center py-16 text-slate-400">
                                        <p className="font-bold text-lg">Harga belum tersedia</p>
                                        <p className="text-sm mt-1">Belum ada paket dengan kombinasi {selectedDay} dan {selectedMeal}.</p>
                                    </div>
                                )}

                                {packages.length === 0 && (
                                    <div className="col-span-full text-center py-16 text-slate-400">
                                        <p className="font-bold text-lg">Belum ada paket tersedia</p>
                                        <p className="text-sm mt-1">Paket langganan sedang dalam persiapan.</p>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
             </div>
        </section>
    );
}
