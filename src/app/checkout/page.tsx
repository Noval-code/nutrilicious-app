"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MapPin, Edit3, ArrowLeft, CreditCard, Shield, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

function formatRupiah(num: number): string {
  return num.toLocaleString('id-ID');
}

export default function CheckoutPage() {
  const { items, totalPrice, clearCart, userAddress, openAddressModal } = useCart();
  const { user, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userAddress) return;

    setIsLoading(true);

    try {
      const checkoutRes = await authFetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/transactions/`, {
        method: "POST",
        body: JSON.stringify({
          customer_name: userAddress.name,
          customer_phone: userAddress.phone,
          customer_address: userAddress.address,
          customer_lat: userAddress.lat,
          customer_lng: userAddress.lng,
          customer_notes: notes,
          items: items.map(item => ({
            type: item.type || 'package',
            name: item.name || item.package_name,
            slug: item.slug || item.package_slug,
            category: item.category || '',
            order_type: item.order_type || '',
            event_date: item.event_date || '',
            event_time: item.event_time || '',
            package_name: item.package_name,
            package_slug: item.package_slug,
            duration: item.duration,
            meal_type: item.meal_type,
            price: item.price.toString(),
            quantity: item.quantity
          }))
        }),
      });

      if (checkoutRes.ok) {
        const txnData = await checkoutRes.json();

        // Jika ada Xendit invoice URL, redirect ke halaman pembayaran Xendit
        toast.success("Pesanan berhasil dibuat. Mengarahkan ke pembayaran...");

        if (txnData.xendit_invoice_url) {
          // Set redirecting DULU agar UI tidak flash "keranjang kosong"
          setIsRedirecting(true);
          clearCart();
          window.location.href = txnData.xendit_invoice_url;
        } else {
          clearCart();
          toast.success("Pesanan berhasil dibuat.");
          // Fallback jika Xendit belum dikonfigurasi
          router.push(`/checkout/success?order_id=${txnData.order_id}`);
        }
      } else {
        const errData = await checkoutRes.json();
        toast.error(errData.error || "Gagal membuat pesanan.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Terjadi kesalahan saat memproses pesanan.");
    } finally {
      if (!isRedirecting) {
        setIsLoading(false);
      }
    }
  };

  // Tampilkan layar loading saat sedang redirect ke Xendit
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#114C2A] mx-auto" />
          <p className="text-lg font-semibold text-[#114C2A]">Mengarahkan ke halaman pembayaran...</p>
          <p className="text-sm text-slate-500">Mohon tunggu sebentar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#114C2A] transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Beranda
        </Link>

        <h1 className="text-3xl font-extrabold mb-8 text-[#114C2A]">Checkout</h1>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg">Keranjang Anda kosong.</p>
            <Link href="/" className="mt-4 inline-block text-[#114C2A] font-semibold hover:underline">
              Lihat Paket Menu
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Address Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#114C2A]" /> Alamat Pengiriman
                </h2>
                <button
                  type="button"
                  onClick={openAddressModal}
                  className="text-xs font-semibold text-[#114C2A] hover:underline flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" /> Ubah
                </button>
              </div>
              {userAddress ? (
                <div className="px-5 py-4 space-y-1">
                  <p className="font-bold text-slate-800">{userAddress.name}</p>
                  <p className="text-sm text-slate-600">{userAddress.phone}</p>
                  <p className="text-sm text-slate-500">{userAddress.address}</p>
                  {userAddress.lat !== null && userAddress.lng !== null && (
                    <p className="text-xs text-slate-400 mt-1">
                      📍 {userAddress.lat.toFixed(5)}, {userAddress.lng.toFixed(5)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="px-5 py-4">
                  <p className="text-sm text-red-500 font-medium">Alamat belum diisi.</p>
                  <button type="button" onClick={openAddressModal} className="text-sm text-[#114C2A] font-semibold hover:underline mt-1">
                    + Tambah Alamat
                  </button>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                <h2 className="font-bold text-sm text-slate-700">Ringkasan Pesanan</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {items.map((item) => (
                  <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{item.name || item.package_name}</p>
                      <p className="text-xs text-slate-400">
                        {item.type === 'menu'
                          ? `${item.category || 'Menu'} · ${item.order_type === 'event' ? 'Acara' : 'Coba Menu'}${item.event_date ? ` · ${item.event_date}${item.event_time ? ` ${item.event_time}` : ''}` : ''} · x${item.quantity}`
                          : `${item.duration} · ${item.meal_type} · x${item.quantity}`}
                      </p>
                    </div>
                    <p className="font-bold text-slate-700 text-sm">Rp{item.price}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Catatan Pesanan (Opsional)</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#114C2A]/30 focus:border-[#114C2A] outline-none transition-all"
                placeholder="Misal: alergi kacang, jangan terlalu pedas"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>


            {/* Total & Submit */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-slate-500">Total Pembayaran</span>
                <span className="text-2xl font-black text-[#114C2A]">Rp{formatRupiah(totalPrice)}</span>
              </div>
              <Button
                type="submit"
                disabled={isLoading || !userAddress}
                className="w-full h-12 bg-[#114C2A] hover:bg-[#1a663a] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memproses Pembayaran...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Bayar Sekarang
                  </span>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
