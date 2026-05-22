"use client";

import React, { useState } from 'react';
import { Utensils, Moon, CupSoda, Check, Sparkles, ChefHat } from 'lucide-react';

const menus = {
  lunch: [
    { title: "Mashed Potatoes & Cordon Bleu", items: ["Mashed Potatoes", "Chicken Cordon Bleu", "Bola-Bola Tempe", "Salad Saus Mayonnaise"], icon: <Utensils /> },
    { title: "Fettucini Carbonara & Beef Patty", items: ["Fettucini Carbonara", "Beef Patty Saus BBQ", "Mixed Vegetables", "Jamur Crispy"], icon: <ChefHat /> },
    { title: "Spaghetti & Bola-Bola Daging", items: ["Spaghetti Garlic", "Bola-Bola Daging", "Jamur Crispy", "Salad Thousand Island"], icon: <Utensils /> },
    { title: "Mashed Potatoes & Omelete", items: ["Mashed Potato", "Chicken Bolognese", "Omelete", "Salad Saus Wijen"], icon: <ChefHat /> },
    { title: "Chicken Steak Saus Mushroom", items: ["Potato Wedges", "Steak Ayam Saus Mushroom", "Mix Vegetables Sautéed", "Jamur Crispy"], icon: <Utensils /> },
    { title: "Nasi Merah Ikan Cabe Garam", items: ["Nasi Merah", "Ikan Cabe Garam", "Telur Rebus", "Tumis Buncis"], icon: <ChefHat /> },
    { title: "Nasi Putih Ayam Saus Madu", items: ["Nasi Putih", "Ayam Saus Madu", "Bola-Bola Tahu", "Salad & Saus Wijen Sambal"], icon: <Utensils /> },
    { title: "Nasi Butter Ikan Saus Lemon", items: ["Nasi Butter", "Ikan Saus Lemon", "Telor Rebus", "Salad Saus Mayonnaise"], icon: <ChefHat /> },
    { title: "Nasi Putih Ikan Asam Pedas", items: ["Nasi Putih", "Ikan Asam Pedas", "Tahu Jamur", "Salad Saus Wijen"], icon: <Utensils /> },
    { title: "Nasi Putih Ayam Tim Jahe", items: ["Nasi Putih", "Ayam Tim Jahe", "Jamur Crispy", "Salad & Sause Thousand Island"], icon: <ChefHat /> },
    { title: "Nasi Putih Ayam Bumbu Pedas", items: ["Nasi Putih", "Ayam Bumbu Pedas", "Tempe Bakar", "Salad Saus Mayonnaise"], icon: <Utensils /> },
    { title: "Nasi Putih Ikan Pesmol", items: ["Nasi Putih", "Ikan Pesmol", "Tempe Bakar", "Salad Saus Mayonnaise"], icon: <ChefHat /> },
    { title: "Nasi Putih Ayam Lada Hitam", items: ["Nasi Putih", "Ayam Lada Hitam", "Rolade Tempe", "Salad & Saus Thousand Island"], icon: <Utensils /> },
    { title: "Nasi Merah Ikan Dabu-Dabu", items: ["Nasi Merah", "Ikan Dabu-Dabu", "Telor Rebus", "Tumis Buncis Wortel"], icon: <ChefHat /> },
  ],
  dinner: [
    { title: "Spring Roll Salad", items: ["Pan-Seared Chicken", "Rice Paper Roll", "Fresh Greens", "Special Sauce"], icon: <Moon /> },
    { title: "Vegetable Sandwich", items: ["Boiled Eggs", "Whole Wheat Bread", "Fresh Greens", "Healthy Dressing"], icon: <Moon /> },
    { title: "Omelette & Smoked Beef", items: ["Smoked Beef", "Omelette Sandwich", "Fresh Greens", "Tomato"], icon: <Moon /> },
    { title: "Triple Decker Sandwich", items: ["Triple Layar Sandwich", "Potato Chips", "Fresh Lettuce", "Meat Slices"], icon: <Moon /> },
    { title: "Tropical Fruit Salad", items: ["Fresh Seasonal Fruits", "Cheese Grating", "Sweet Dressing"], icon: <Moon /> },
    { title: "Yogurt Salad", items: ["Fresh Fruits", "Dragon Fruit & Melon", "Healthy Yogurt Dressing", "Cheese Grating"], icon: <Moon /> },
    { title: "Boiled Vegetables", items: ["Peanut Sauce (Pecel)", "Tofu & Tempeh", "Boiled Greens", "Potato"], icon: <Moon /> },
    { title: "Pan Seared Chicken Salad", items: ["Pan Seared Chicken Breast", "Potato", "Fresh Greens & Tomato", "Special Dressing"], icon: <Moon /> },
  ],
  drinks: [
    { title: "Jus Jambu", items: ["Homemade 100% Natural", "Tanpa Bahan Pengawet", "Less Sugar", "Filtered Water Blend"], icon: <CupSoda /> },
    { title: "Infused Water", items: ["Lemon Mint", "Homemade 100% Natural", "Tanpa Bahan Pengawet", "Filtered Water Blend"], icon: <CupSoda /> },
    { title: "Jus Semangka", items: ["Homemade 100% Natural", "Tanpa Bahan Pengawet", "Less Sugar", "Filtered Water Blend"], icon: <CupSoda /> },
  ]
};

type Category = 'lunch' | 'dinner' | 'drinks';

export function MenuCatalog() {
    const [activeTab, setActiveTab] = useState<Category>('lunch');

    return (
        <section className="w-full relative py-20 bg-white overflow-hidden" id="menu-catalog">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#f2f6f4] to-transparent z-0"></div>
            <div className="absolute -left-32 top-32 w-80 h-80 bg-[#F9A826]/10 rounded-full blur-[80px] z-0"></div>
            <div className="absolute -right-32 top-96 w-96 h-96 bg-[#114C2A]/5 rounded-full blur-[100px] z-0"></div>

            <div className="container relative mx-auto px-4 md:px-6 z-10">
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <span className="inline-flex items-center gap-2 bg-[#114C2A]/10 text-[#114C2A] px-4 py-1.5 rounded-full text-sm font-bold tracking-wide mb-4 uppercase">
                        <Sparkles className="w-4 h-4" /> Variasi Tanpa Batas
                    </span>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-800 tracking-tight leading-tight">
                        Eksplorasi Rasa <span className="text-[#114C2A]">Setiap Hari</span>
                    </h2>
                    <p className="mt-5 text-slate-500 text-lg">
                        Beragam pilihan menu lezat yang disiapkan khusus oleh chef dan ahli gizi kami untuk memastikan program diet Anda tidak pernah membosankan.
                    </p>
                </div>

                {/* Categories Tabs */}
                <div className="flex flex-wrap justify-center gap-3 mb-12">
                    <button 
                        onClick={() => setActiveTab('lunch')}
                        className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all ${activeTab === 'lunch' ? 'bg-[#114C2A] text-white shadow-[0_8px_20px_rgba(17,76,42,0.3)] scale-105' : 'bg-white text-slate-600 border border-gray-100 hover:bg-gray-50'}`}
                    >
                        <Utensils className="w-5 h-5" />
                        LUNCH MENU
                    </button>
                    <button 
                        onClick={() => setActiveTab('dinner')}
                        className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all ${activeTab === 'dinner' ? 'bg-[#114C2A] text-white shadow-[0_8px_20px_rgba(17,76,42,0.3)] scale-105' : 'bg-white text-slate-600 border border-gray-100 hover:bg-gray-50'}`}
                    >
                        <Moon className="w-5 h-5" />
                        DINNER MENU
                    </button>
                    <button 
                        onClick={() => setActiveTab('drinks')}
                        className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all ${activeTab === 'drinks' ? 'bg-[#F9A826] text-[#114C2A] shadow-[0_8px_20px_rgba(249,168,38,0.4)] scale-105' : 'bg-white text-slate-600 border border-gray-100 hover:bg-gray-50'}`}
                    >
                        <CupSoda className="w-5 h-5" />
                        FRESH DRINKS
                    </button>
                </div>

                {/* Grid Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {menus[activeTab].map((menu, idx) => (
                        <div key={idx} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col h-full transform hover:-translate-y-1 relative overflow-hidden">
                            {/* Card Accent */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#114C2A]/5 to-[#F9A826]/10 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"/>
                            
                            {/* Icon Background */}
                            <div className="w-12 h-12 bg-[#f2f6f4] text-[#114C2A] rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#F9A826] group-hover:text-white transition-colors z-10 relative">
                                {menu.icon}
                            </div>
                            
                            <h3 className="text-xl font-extrabold text-slate-800 mb-4 leading-snug z-10 relative pr-4">
                                {menu.title}
                            </h3>
                            
                            <div className="w-8 h-1 bg-[#F9A826] rounded-full mb-5 transition-all group-hover:w-16"></div>

                            <ul className="flex-1 space-y-3 z-10 relative">
                                {menu.items.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2 text-slate-600 text-sm">
                                        <Check className="w-4 h-4 text-[#114C2A] shrink-0 mt-0.5" />
                                        <span className="leading-tight">{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-end z-10 relative">
                                <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-[#114C2A] group-hover:text-white transition-colors hover:cursor-pointer">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* CTA or bottom note */}
                {activeTab !== 'drinks' && (
                    <div className="mt-12 text-center text-sm font-medium text-slate-500 bg-[#f2f6f4] inline-block px-6 py-3 rounded-full border border-[#e2eae4]">
                        Menu dapat berubah sewaktu-waktu tergantung ketersediaan bahan segar harian.
                    </div>
                )}
            </div>
        </section>
    );
}
