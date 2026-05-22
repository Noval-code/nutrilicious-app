"use client";

import React, { useState } from 'react';
import { Leaf, Salad, Dumbbell, CalendarDays, Utensils, UtensilsCrossed, CheckCircle2, ShoppingCart, Check } from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';

const daysList = ["5 Hari", "6 Hari", "10 Hari", "30 Hari"];
const mealTypesList = ["Lunch", "Dinner", "Lunch & Dinner"];

const packages = [
  {
    id: "low-carbs",
    category: "Low Carbs",
    icon: <Leaf className="w-8 h-8 md:w-10 md:h-10 text-inherit" />,
    description: "Diet rendah karbohidrat yang kaya akan serat. Pilihan cerdas untuk program weight loss intensif dan sehat.",
    pricing: {
      "5 Hari": {
        "Lunch": { normal: "180.000", promo: "150.000" },
        "Dinner": { normal: "180.000", promo: "150.000" },
        "Lunch & Dinner": { normal: "350.000", promo: "290.000" }
      },
      "6 Hari": {
        "Lunch": { normal: "210.000", promo: "175.000" },
        "Dinner": { normal: "210.000", promo: "175.000" },
        "Lunch & Dinner": { normal: "420.000", promo: "345.000" }
      },
      "10 Hari": {
        "Lunch": { normal: "350.000", promo: "290.000" },
        "Dinner": { normal: "350.000", promo: "290.000" },
        "Lunch & Dinner": { normal: "700.000", promo: "570.000" }
      },
      "30 Hari": {
        "Lunch": { normal: "1.050.000", promo: "860.000" },
        "Dinner": { normal: "1.050.000", promo: "860.000" },
        "Lunch & Dinner": { normal: "2.100.000", promo: "1.700.000" }
      }
    }
  },
  {
    id: "healthy-food",
    category: "Healthy Food",
    icon: <Salad className="w-8 h-8 md:w-10 md:h-10 text-inherit" />,
    description: "Pola makan seimbang dengan bahan berkualitas dan bernutrisi tinggi. Semakin mudah untuk menjaga pola hidup sehat.",
    pricing: {
      "5 Hari": {
        "Lunch": { normal: "180.000", promo: "150.000" },
        "Dinner": { normal: "180.000", promo: "150.000" },
        "Lunch & Dinner": { normal: "350.000", promo: "290.000" }
      },
      "6 Hari": {
        "Lunch": { normal: "210.000", promo: "175.000" },
        "Dinner": { normal: "210.000", promo: "175.000" },
        "Lunch & Dinner": { normal: "420.000", promo: "345.000" }
      },
      "10 Hari": {
        "Lunch": { normal: "350.000", promo: "290.000" },
        "Dinner": { normal: "350.000", promo: "290.000" },
        "Lunch & Dinner": { normal: "700.000", promo: "570.000" }
      },
      "30 Hari": {
        "Lunch": { normal: "1.050.000", promo: "860.000" },
        "Dinner": { normal: "1.050.000", promo: "860.000" },
        "Lunch & Dinner": { normal: "2.100.000", promo: "1.700.000" }
      }
    }
  },
  {
    id: "muscle-gain",
    category: "Muscle Gain",
    icon: <Dumbbell className="w-8 h-8 md:w-10 md:h-10 text-inherit" />,
    description: "Tinggi protein dan kalori optimal untuk mendukung hipertrofi otot dan recovery setelah latihan beban.",
    pricing: {
      "5 Hari": {
        "Lunch": { normal: "270.000", promo: "225.000" },
        "Dinner": { normal: "270.000", promo: "225.000" },
        "Lunch & Dinner": { normal: "520.000", promo: "440.000" }
      },
      "6 Hari": {
        "Lunch": { normal: "320.000", promo: "265.000" },
        "Dinner": { normal: "320.000", promo: "265.000" },
        "Lunch & Dinner": { normal: "610.000", promo: "520.000" }
      },
      "10 Hari": {
        "Lunch": { normal: "530.000", promo: "440.000" },
        "Dinner": { normal: "530.000", promo: "440.000" },
        "Lunch & Dinner": { normal: "1.050.000", promo: "865.000" }
      },
      "30 Hari": {
        "Lunch": { normal: "1.600.000", promo: "1.310.000" },
        "Dinner": { normal: "1.600.000", promo: "1.310.000" },
        "Lunch & Dinner": { normal: "3.200.000", promo: "2.590.000" }
      }
    }
  }
];

export function PricingSection() {
    const [selectedDay, setSelectedDay] = useState("5 Hari");
    const [selectedMeal, setSelectedMeal] = useState("Lunch");
    const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
    const { addItem } = useCart();

    const handleAddToCart = (pkg: typeof packages[0]) => {
        const pricing = (pkg.pricing as any)[selectedDay][selectedMeal];
        addItem({
            package_name: pkg.category,
            package_slug: pkg.id,
            duration: selectedDay,
            meal_type: selectedMeal,
            price: pricing.promo,
        });

        // Show "added" animation
        const key = `${pkg.id}-${selectedDay}-${selectedMeal}`;
        setAddedItems(prev => ({ ...prev, [key]: true }));
        setTimeout(() => {
            setAddedItems(prev => ({ ...prev, [key]: false }));
        }, 1500);
    };

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

                        {/* Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {packages.map((pkg) => {
                                const pricing = (pkg.pricing as any)[selectedDay][selectedMeal];
                                const itemKey = `${pkg.id}-${selectedDay}-${selectedMeal}`;
                                const justAdded = addedItems[itemKey];

                                return (
                                    <div key={pkg.id} className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl border border-gray-100 flex flex-col relative group transition-all duration-300">
                                        
                                        {(pricing as any).freeDays && (
                                            <div className="absolute -top-3 -right-3 z-10 transition-transform group-hover:scale-110">
                                                <span className="bg-[#114C2A] text-[#F9A826] font-extrabold text-[10px] md:text-xs uppercase tracking-widest py-1.5 px-4 rounded-full shadow-lg border-2 border-white flex items-center gap-1">
                                                    ✨ {(pricing as any).freeDays}
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex items-start gap-4 mb-5">
                                            <div className="w-16 h-16 rounded-2xl bg-[#f2f6f4] text-[#114C2A] flex items-center justify-center group-hover:bg-[#114C2A] group-hover:text-white transition-all duration-500 shadow-sm border border-[#e2eae4]">
                                                {pkg.icon}
                                            </div>
                                            <div className="pt-2">
                                                <h3 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight">{pkg.category}</h3>
                                            </div>
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
                        </div>

                    </div>
                </div>
             </div>
        </section>
    );
}
