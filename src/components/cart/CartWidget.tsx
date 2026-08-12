"use client";

import React from 'react';
import { useCart } from './CartProvider';
import { ShoppingCart, X, Plus, Minus, Trash2, ArrowRight, MapPin, Edit3 } from 'lucide-react';
import Link from 'next/link';

function formatRupiah(num: number): string {
  return num.toLocaleString('id-ID');
}

export function CartWidget() {
  const { items, totalItems, totalPrice, isCartOpen, setIsCartOpen, removeItem, updateQuantity, userAddress, openAddressModal } = useCart();

  return (
    <>
      {/* Floating Cart Button */}
      <button
        id="cart-widget-button"
        onClick={() => setIsCartOpen(true)}
        className="fixed bottom-6 right-24 z-40 w-14 h-14 bg-[#114C2A] text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center group"
        aria-label="Buka keranjang"
      >
        <ShoppingCart className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-[#F9A826] text-[#114C2A] text-xs font-black rounded-full flex items-center justify-center shadow-md animate-bounce">
            {totalItems}
          </span>
        )}
      </button>

      {/* Slide-out Cart Panel */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 font-sans">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-[#114C2A] to-[#1a663a]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <ShoppingCart className="w-5 h-5 text-[#F9A826]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-white">Keranjang</h2>
                    <p className="text-xs text-white/60 font-medium">{totalItems} item</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/70 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Address Info Bar */}
            {userAddress && userAddress.address && (
              <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MapPin className="w-3.5 h-3.5 text-[#114C2A] shrink-0" />
                  <p className="text-xs text-slate-600 truncate">{userAddress.address}</p>
                </div>
                <button
                  onClick={openAddressModal}
                  className="text-[10px] font-semibold text-[#114C2A] hover:underline flex items-center gap-0.5 shrink-0"
                >
                  <Edit3 className="w-2.5 h-2.5" /> Ubah
                </button>
              </div>
            )}

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
                    <ShoppingCart className="w-10 h-10 text-slate-200" />
                  </div>
                  <p className="font-bold text-slate-700 text-lg">Keranjang Kosong</p>
                  <p className="text-slate-400 text-sm mt-1 max-w-[240px]">
                    Pilih paket langganan atau menu perporsi yang sesuai.
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-extrabold text-slate-800 text-sm">{item.name || item.package_name}</h3>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {item.type === 'menu' ? (
                            <>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#f2f6f4] text-[#114C2A] text-[10px] font-bold">
                                {item.category || 'Menu'}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold">
                                {item.order_type === 'event' ? 'Acara' : 'Coba Menu'}
                              </span>
                              {item.event_date && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
                                  {item.event_date}{item.event_time ? ` ${item.event_time}` : ''}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#f2f6f4] text-[#114C2A] text-[10px] font-bold">
                                {item.duration}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold">
                                {item.meal_type}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="Hapus item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-slate-500 hover:border-[#114C2A] hover:text-[#114C2A] transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center font-black text-slate-700 text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-slate-500 hover:border-[#114C2A] hover:text-[#114C2A] transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="font-black text-[#114C2A] text-sm">
                        Rp{item.price}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-5 border-t border-gray-100 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.04)]">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-slate-500">Total Pembayaran</span>
                  <span className="text-xl font-black text-[#114C2A]">
                    Rp{formatRupiah(totalPrice)}
                  </span>
                </div>
                <Link
                  href="/checkout"
                  onClick={() => setIsCartOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#114C2A] text-white rounded-xl font-bold shadow-lg hover:bg-[#1a663a] hover:shadow-xl transition-all duration-300 group"
                >
                  Checkout Sekarang
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
