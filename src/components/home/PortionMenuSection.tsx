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
  promo_price?: number;
  promo_start_date?: string;
  promo_end_date?: string;
  is_promo_active?: boolean;
  event_discount_tiers?: { min_qty: number; discount_percent: number }[];
}

function formatRupiah(value: number) {
  return value.toLocaleString('id-ID');
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function isPromoActive(menu: PortionMenu) {
  if (!menu.is_promo_active || !menu.promo_price || menu.promo_price <= 0) return false;
  const today = todayValue();
  if (menu.promo_start_date && today < menu.promo_start_date) return false;
  if (menu.promo_end_date && today > menu.promo_end_date) return false;
  return true;
}

function getEventDiscount(menu: PortionMenu, quantity: number) {
  return getSortedEventTiers(menu)
    .filter(tier => quantity >= Number(tier.min_qty || 0))
    .sort((a, b) => Number(b.min_qty || 0) - Number(a.min_qty || 0))[0]?.discount_percent || 0;
}

function getSortedEventTiers(menu: PortionMenu) {
  return [...(menu.event_discount_tiers || [])]
    .filter(tier => Number(tier.min_qty || 0) > 0 && Number(tier.discount_percent || 0) > 0)
    .sort((a, b) => Number(a.min_qty || 0) - Number(b.min_qty || 0));
}

function getMenuPricing(menu: PortionMenu, orderType: 'regular' | 'event', quantity: number) {
  const originalPrice = Number(menu.price || 0);
  if (orderType === 'event') {
    const discountPercent = getEventDiscount(menu, quantity);
    const finalPrice = Math.max(0, Math.round(originalPrice - (originalPrice * discountPercent / 100)));
    return { originalPrice, finalPrice, promoPrice: 0, discountPercent };
  }
  const activePromo = isPromoActive(menu);
  const promoPrice = activePromo ? Number(menu.promo_price || 0) : 0;
  return {
    originalPrice,
    finalPrice: activePromo ? promoPrice : originalPrice,
    promoPrice,
    discountPercent: activePromo && originalPrice > 0 ? Math.round(((originalPrice - promoPrice) / originalPrice) * 100) : 0,
  };
}

interface MenuCardProps {
  menu: PortionMenu;
  categoryLabel: string;
  quantity: number;
  pricing: ReturnType<typeof getMenuPricing>;
  hasDiscount: boolean;
  justAdded?: boolean;
  orderType: 'regular' | 'event';
  eventDate?: string;
  eventTime?: string;
  onEventDateChange?: (value: string) => void;
  onEventTimeChange?: (value: string) => void;
  onDecrease: () => void;
  onIncrease: () => void;
  onAdd: () => void;
}

function MenuCard({
  menu,
  categoryLabel,
  quantity,
  pricing,
  hasDiscount,
  justAdded,
  orderType,
  eventDate = '',
  eventTime = '',
  onEventDateChange,
  onEventTimeChange,
  onDecrease,
  onIncrease,
  onAdd,
}: MenuCardProps) {
  const eventTiers = getSortedEventTiers(menu);
  const discountLabel = orderType === 'event' ? 'Diskon Acara' : 'Promo';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col">
      {menu.image_url && (
        <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
          <Image src={menu.image_url} alt={menu.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
          {hasDiscount && (
            <div className="absolute right-3 top-3 rounded-full bg-[#C76A00] px-4 py-2 text-xs font-black text-white shadow-lg">
              {discountLabel === 'Promo' ? 'Promo' : 'Diskon'} {pricing.discountPercent ? `${pricing.discountPercent}%` : ''}
            </div>
          )}
        </div>
      )}
      <div className="p-6 flex flex-col flex-1 bg-white">
        <div className="mb-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#114C2A] mb-2">{categoryLabel}</p>
          <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{menu.title}</h3>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4 text-[11px] font-bold">
          {menu.calories ? <span className="bg-slate-100 text-slate-700 border border-slate-200/60 px-2 py-0.5 rounded-lg">{menu.calories} kcal</span> : null}
          {menu.protein ? <span className="bg-slate-100 text-slate-700 border border-slate-200/60 px-2 py-0.5 rounded-lg">Protein {menu.protein}g</span> : null}
          {menu.carbs ? <span className="bg-slate-100 text-slate-700 border border-slate-200/60 px-2 py-0.5 rounded-lg">Karbo {menu.carbs}g</span> : null}
          {menu.fat ? <span className="bg-slate-100 text-slate-700 border border-slate-200/60 px-2 py-0.5 rounded-lg">Lemak {menu.fat}g</span> : null}
          {menu.sugar ? <span className="bg-slate-100 text-slate-700 border border-slate-200/60 px-2 py-0.5 rounded-lg">Gula {menu.sugar}g</span> : null}
        </div>

        <div className="mb-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-2xl font-black leading-tight tracking-tight text-slate-900">Rp {formatRupiah(pricing.finalPrice)}</p>
            {hasDiscount && (
              <p className="text-sm font-semibold text-slate-500 line-through decoration-red-500 decoration-2">Rp {formatRupiah(pricing.originalPrice)}</p>
            )}
          </div>
        </div>

        <div className="space-y-3 mt-auto">
          {orderType === 'event' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="date" min={todayValue()} value={eventDate} onChange={(e) => onEventDateChange?.(e.target.value)} className="w-full border border-gray-200 rounded-xl pl-9 pr-2 py-2 text-xs font-semibold" />
                </div>
                <input type="time" value={eventTime} onChange={(e) => onEventTimeChange?.(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold" />
              </div>
              {menu.event_discount_tiers && menu.event_discount_tiers.length > 0 && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[11px] font-black text-amber-700 uppercase tracking-wide">Promo Acara</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {eventTiers.map(tier => {
                      const isActive = quantity >= Number(tier.min_qty || 0);
                      return (
                        <span
                          key={`${tier.min_qty}-${tier.discount_percent}`}
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-black ${
                            isActive ? 'bg-[#114C2A] text-white' : 'bg-white text-amber-700 border border-amber-100'
                          }`}
                        >
                          {Number(tier.min_qty || 0)}+ porsi: {Number(tier.discount_percent || 0)}%
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={onDecrease} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-slate-500"><Minus className="w-4 h-4" /></button>
              <span className="w-10 text-center font-black text-slate-700">{quantity}</span>
              <button onClick={onIncrease} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-slate-500"><Plus className="w-4 h-4" /></button>
            </div>
            <button onClick={onAdd} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${justAdded ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-[#114C2A]'}`}>
              {justAdded ? <><Check className="w-4 h-4" />Ditambahkan</> : <><ShoppingCart className="w-4 h-4" />{orderType === 'event' ? 'Pesan Acara' : 'Tambah'}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PortionMenuSection() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menus, setMenus] = useState<PortionMenu[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat menu perporsi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredMenus = selectedCategory === 'all'
    ? menus
    : menus.filter(menu => menu.category === selectedCategory);

  const getQuantity = (id: string) => quantities[id] || 1;

  const handleAddToCart = (menu: PortionMenu, orderType: 'regular' | 'event') => {
    const quantity = getQuantity(menu._id);
    const eventDate = eventDates[menu._id] || '';
    const eventTime = eventTimes[menu._id] || '';

    if (orderType === 'event' && !eventDate) {
      setError('Tanggal acara wajib diisi untuk pesanan acara.');
      return;
    }

    const pricing = getMenuPricing(menu, orderType, quantity);

    addItem({
      type: 'menu',
      name: menu.title,
      slug: menu._id,
      category: categories.find(cat => cat.slug === menu.category)?.name || menu.category,
      price: String(pricing.finalPrice),
      original_price: String(pricing.originalPrice),
      promo_price: pricing.promoPrice ? String(pricing.promoPrice) : '',
      discount_percent: pricing.discountPercent,
      order_type: orderType,
      event_date: orderType === 'event' ? eventDate : '',
      event_time: orderType === 'event' ? eventTime : '',
      duration: '',
      meal_type: '',
    }, quantity);

    const addedKey = `${menu._id}-${orderType}`;
    setAddedItems(prev => ({ ...prev, [addedKey]: true }));
    setTimeout(() => setAddedItems(prev => ({ ...prev, [addedKey]: false })), 1500);
  };

  return (
    <section id="portion-menu" className="w-full relative py-16 md:py-24 bg-white border-t border-gray-100">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 bg-[#F9A826]/15 text-[#114C2A] px-4 py-1.5 rounded-full text-sm font-bold tracking-wide mb-4 uppercase">
            <Sparkles className="w-4 h-4" /> Pesan Menu
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight">Menu Satuan dan Acara</h2>
          <p className="mt-4 text-slate-500 text-base md:text-lg">
            Pesan menu satuan untuk coba rasa, atau pilih layanan acara untuk kebutuhan borongan.
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

            <div className="space-y-16 max-w-7xl mx-auto">
              <div id="menu-satuan" className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black text-[#114C2A]">Menu Satuan</h3>
                    <p className="text-slate-500 text-sm md:text-base mt-1">Cocok untuk coba rasa atau pesan harian per porsi.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredMenus.map(menu => {
                    const quantity = getQuantity(menu._id);
                    const justAdded = addedItems[`${menu._id}-regular`];
                    const pricing = getMenuPricing(menu, 'regular', quantity);
                    const hasDiscount = pricing.finalPrice < pricing.originalPrice;

                    return (
                      <MenuCard
                        key={`regular-${menu._id}`}
                        menu={menu}
                        categoryLabel={categories.find(cat => cat.slug === menu.category)?.name || menu.category}
                        quantity={quantity}
                        pricing={pricing}
                        hasDiscount={hasDiscount}
                        justAdded={justAdded}
                        orderType="regular"
                        onDecrease={() => setQuantities(prev => ({ ...prev, [menu._id]: Math.max(1, quantity - 1) }))}
                        onIncrease={() => setQuantities(prev => ({ ...prev, [menu._id]: quantity + 1 }))}
                        onAdd={() => handleAddToCart(menu, 'regular')}
                      />
                    );
                  })}
                </div>
              </div>

              <div id="menu-acara" className="space-y-6 bg-slate-50 border border-gray-100 rounded-[32px] p-5 md:p-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black text-[#114C2A]">Menu Acara & Borongan</h3>
                    <p className="text-slate-500 text-sm md:text-base mt-1">Untuk pesanan jumlah besar dengan tanggal acara dan diskon bertingkat.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredMenus.map(menu => {
                    const quantity = getQuantity(menu._id);
                    const justAdded = addedItems[`${menu._id}-event`];
                    const pricing = getMenuPricing(menu, 'event', quantity);
                    const hasDiscount = pricing.finalPrice < pricing.originalPrice;

                    return (
                      <MenuCard
                        key={`event-${menu._id}`}
                        menu={menu}
                        categoryLabel={categories.find(cat => cat.slug === menu.category)?.name || menu.category}
                        quantity={quantity}
                        pricing={pricing}
                        hasDiscount={hasDiscount}
                        justAdded={justAdded}
                        orderType="event"
                        eventDate={eventDates[menu._id] || ''}
                        eventTime={eventTimes[menu._id] || ''}
                        onEventDateChange={(value) => setEventDates(prev => ({ ...prev, [menu._id]: value }))}
                        onEventTimeChange={(value) => setEventTimes(prev => ({ ...prev, [menu._id]: value }))}
                        onDecrease={() => setQuantities(prev => ({ ...prev, [menu._id]: Math.max(1, quantity - 1) }))}
                        onIncrease={() => setQuantities(prev => ({ ...prev, [menu._id]: quantity + 1 }))}
                        onAdd={() => handleAddToCart(menu, 'event')}
                      />
                    );
                  })}
                </div>
              </div>
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
