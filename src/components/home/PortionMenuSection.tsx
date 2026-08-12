"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { AlertCircle, CalendarDays, Check, Loader2, Minus, Plus, RefreshCw, ShoppingCart, Sparkles, Users } from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ''}/api`;

interface MenuCategory {
  _id: string;
  name: string;
  slug: string;
}

interface PortionMenu {
  _id: string;
  title: string;
  category: string;
  items: string[];
  image_url?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sugar?: number;
  price: number;
}

function formatRupiah(value: number) {
  return value.toLocaleString('id-ID');
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

export function PortionMenuSection() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menus, setMenus] = useState<PortionMenu[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [orderTypes, setOrderTypes] = useState<Record<string, 'regular' | 'event'>>({});
  const [eventDates, setEventDates] = useState<Record<string, string>>({});
  const [eventTimes, setEventTimes] = useState<Record<string, string>>({});
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [catRes, menuRes] = await Promise.all([
        fetch(`${API_URL}/menu-categories/?active_only=true`),
        fetch(`${API_URL}/menus/?orderable=true&available=true`),
      ]);
      if (!catRes.ok) throw new Error('Gagal memuat kategori menu');
      if (!menuRes.ok) throw new Error('Gagal memuat menu perporsi');
      setCategories(await catRes.json());
      setMenus(await menuRes.json());
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memuat menu perporsi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredMenus = selectedCategory === 'all'
    ? menus
    : menus.filter(menu => menu.category === selectedCategory);

  const getQuantity = (id: string) => quantities[id] || 1;
  const getOrderType = (id: string) => orderTypes[id] || 'regular';

  const handleAddToCart = (menu: PortionMenu) => {
    const quantity = getQuantity(menu._id);
    const orderType = getOrderType(menu._id);
    const eventDate = eventDates[menu._id] || '';
    const eventTime = eventTimes[menu._id] || '';

    if (orderType === 'event' && !eventDate) {
      setError('Tanggal acara wajib diisi untuk pesanan acara.');
      return;
    }

    addItem({
      type: 'menu',
      name: menu.title,
      slug: menu._id,
      category: categories.find(cat => cat.slug === menu.category)?.name || menu.category,
      price: String(menu.price),
      order_type: orderType,
      event_date: orderType === 'event' ? eventDate : '',
      event_time: orderType === 'event' ? eventTime : '',
      duration: '',
      meal_type: '',
    }, quantity);

    setAddedItems(prev => ({ ...prev, [menu._id]: true }));
    setTimeout(() => setAddedItems(prev => ({ ...prev, [menu._id]: false })), 1500);
  };

  return (
    <section id="portion-menu" className="w-full relative py-16 md:py-24 bg-white border-t border-gray-100">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 bg-[#F9A826]/15 text-[#114C2A] px-4 py-1.5 rounded-full text-sm font-bold tracking-wide mb-4 uppercase">
            <Sparkles className="w-4 h-4" /> Pesan Perporsi
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight">Menu untuk Coba Rasa dan Acara</h2>
          <p className="mt-4 text-slate-500 text-base md:text-lg">
            Pilih menu satuan untuk kebutuhan harian atau pesan dalam jumlah besar untuk acara.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 font-bold text-sm mb-6 max-w-2xl mx-auto flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</span>
            <button onClick={() => { setError(null); fetchData(); }} className="text-red-700 underline inline-flex items-center gap-1"><RefreshCw className="w-3 h-3" />Muat ulang</button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-500 font-bold">
            <Loader2 className="w-8 h-8 animate-spin text-[#114C2A]" /> Memuat menu perporsi...
          </div>
        ) : (
          <>
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${selectedCategory === 'all' ? 'bg-[#114C2A] text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                Semua
              </button>
              {categories.map(category => (
                <button
                  key={category._id}
                  onClick={() => setSelectedCategory(category.slug)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${selectedCategory === category.slug ? 'bg-[#114C2A] text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {filteredMenus.map(menu => {
                const quantity = getQuantity(menu._id);
                const orderType = getOrderType(menu._id);
                const justAdded = addedItems[menu._id];

                return (
                  <div key={menu._id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col">
                    {menu.image_url && (
                      <div className="relative aspect-[4/3] bg-slate-100">
                        <Image src={menu.image_url} alt={menu.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                      </div>
                    )}
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-[#114C2A]">{categories.find(cat => cat.slug === menu.category)?.name || menu.category}</p>
                          <h3 className="text-xl font-extrabold text-slate-800 mt-1">{menu.title}</h3>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold text-slate-400">per porsi</p>
                          <p className="font-black text-[#114C2A]">Rp{formatRupiah(Number(menu.price || 0))}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-4 text-[11px] font-bold">
                        {menu.calories ? <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg">{menu.calories} kcal</span> : null}
                        {menu.protein ? <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg">Protein {menu.protein}g</span> : null}
                        {menu.carbs ? <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg">Karbo {menu.carbs}g</span> : null}
                      </div>

                      <div className="space-y-3 mt-auto">
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => setOrderTypes(prev => ({ ...prev, [menu._id]: 'regular' }))} className={`py-2 rounded-xl text-xs font-bold border ${orderType === 'regular' ? 'border-[#114C2A] bg-[#114C2A]/5 text-[#114C2A]' : 'border-gray-100 text-slate-400'}`}>Coba Menu</button>
                          <button onClick={() => setOrderTypes(prev => ({ ...prev, [menu._id]: 'event' }))} className={`py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 ${orderType === 'event' ? 'border-[#114C2A] bg-[#114C2A]/5 text-[#114C2A]' : 'border-gray-100 text-slate-400'}`}><Users className="w-3 h-3" />Acara</button>
                        </div>

                        {orderType === 'event' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="relative">
                              <CalendarDays className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input type="date" min={todayValue()} value={eventDates[menu._id] || ''} onChange={(e) => setEventDates(prev => ({ ...prev, [menu._id]: e.target.value }))} className="w-full border border-gray-200 rounded-xl pl-9 pr-2 py-2 text-xs font-semibold" />
                            </div>
                            <input type="time" value={eventTimes[menu._id] || ''} onChange={(e) => setEventTimes(prev => ({ ...prev, [menu._id]: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold" />
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setQuantities(prev => ({ ...prev, [menu._id]: Math.max(1, quantity - 1) }))} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-slate-500"><Minus className="w-4 h-4" /></button>
                            <span className="w-10 text-center font-black text-slate-700">{quantity}</span>
                            <button onClick={() => setQuantities(prev => ({ ...prev, [menu._id]: quantity + 1 }))} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-slate-500"><Plus className="w-4 h-4" /></button>
                          </div>
                          <button onClick={() => handleAddToCart(menu)} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${justAdded ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-[#114C2A]'}`}>
                            {justAdded ? <><Check className="w-4 h-4" />Ditambahkan</> : <><ShoppingCart className="w-4 h-4" />Tambah</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredMenus.length === 0 && (
              <div className="text-center py-16 text-slate-400 font-semibold">Belum ada menu perporsi untuk kategori ini.</div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
