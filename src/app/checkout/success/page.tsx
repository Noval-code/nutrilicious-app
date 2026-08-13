"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, Package, ArrowRight, Home, Loader2, XCircle } from "lucide-react";

interface Transaction {
  _id: string;
  order_id: string;
  status: string;
  payment_status: string;
  total: number;
  payment_option?: 'full' | 'dp';
  dp_percentage?: number;
  dp_amount?: number;
  remaining_amount?: number;
  pay_amount?: number;
  is_remaining_paid?: boolean;
  remaining_payment_status?: string;
  xendit_invoice_url?: string;
  items: Array<{
    type?: 'package' | 'menu';
    name?: string;
    category?: string;
    order_type?: string;
    event_date?: string;
    event_time?: string;
    package_name: string;
    duration: string;
    meal_type: string;
    quantity: number;
    price: number;
  }>;
  customer_name: string;
  created_at: string;
}

function formatRupiah(num: number): string {
  return num.toLocaleString('id-ID');
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const paymentType = searchParams.get("payment");

  const [txn, setTxn] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) {
      setError("Order ID tidak ditemukan.");
      setLoading(false);
      return;
    }

    let attempts = 0;
    const maxAttempts = 10;

    const fetchStatus = async () => {
      try {
        const suffix = paymentType === 'remaining' ? '?payment=remaining' : '';
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/transactions/check-status/${orderId}${suffix}`);
        if (res.ok) {
          const data = await res.json();
          setTxn(data);

          // Jika masih pending, poll lagi (mungkin webhook belum datang)
          if (((paymentType === 'remaining' && !data.is_remaining_paid) || data.status === "pending_payment") && attempts < maxAttempts) {
            attempts++;
            setTimeout(fetchStatus, 3000);
          }
        } else {
          setError("Pesanan tidak ditemukan.");
        }
      } catch {
        setError("Gagal memuat data pesanan.");
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [orderId, paymentType]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#114C2A] animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Memuat status pembayaran...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Oops!</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#114C2A] text-white rounded-xl font-bold hover:bg-[#1a663a] transition-all shadow-lg"
          >
            <Home className="w-4 h-4" /> Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = txn?.status === "confirmed" || txn?.payment_status === "PAID" || txn?.payment_status === "SETTLED";
  const isRemainingPayment = paymentType === 'remaining';
  const isRemainingPaid = Boolean(txn?.is_remaining_paid);
  const isPending = txn?.status === "pending_payment";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-12 max-w-lg">
        {/* Status Icon */}
        <div className="text-center mb-8">
          {isRemainingPayment && isRemainingPaid ? (
            <>
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-14 h-14 text-green-500" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Pelunasan Berhasil!</h1>
              <p className="text-slate-500 text-sm">Sisa tagihan pesanan Anda sudah lunas.</p>
            </>
          ) : isPaid ? (
            <>
              <div className="relative inline-flex">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                  <CheckCircle2 className="w-14 h-14 text-green-500" />
                </div>
                <div className="absolute -top-1 -right-1 w-8 h-8 bg-[#F9A826] rounded-full flex items-center justify-center text-sm">
                  🎉
                </div>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Pembayaran Berhasil!</h1>
              <p className="text-slate-500 text-sm">Terima kasih, pesanan Anda sedang diproses.</p>
            </>
          ) : isPending || (isRemainingPayment && !isRemainingPaid) ? (
            <>
              <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-14 h-14 text-amber-500 animate-pulse" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Menunggu Pembayaran</h1>
              <p className="text-slate-500 text-sm">Silakan selesaikan {isRemainingPayment ? 'pelunasan sisa tagihan' : 'pembayaran'} Anda.</p>
              {txn?.xendit_invoice_url && (
                <a
                  href={txn.xendit_invoice_url}
                  className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-[#114C2A] text-white rounded-xl font-bold hover:bg-[#1a663a] transition-all shadow-lg"
                >
                  Bayar Sekarang <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </>
          ) : (
            <>
              <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-14 h-14 text-red-400" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Pembayaran Gagal</h1>
              <p className="text-slate-500 text-sm">Pesanan telah dibatalkan atau kedaluwarsa.</p>
            </>
          )}
        </div>

        {/* Order Details Card */}
        {txn && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-[#114C2A]" />
              <h2 className="font-bold text-sm text-slate-700">Detail Pesanan</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Order ID</span>
                <span className="font-mono font-bold text-sm text-[#114C2A]">{txn.order_id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Status</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  isPaid
                    ? "bg-green-100 text-green-700"
                    : isPending
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                }`}>
                  {isPaid ? "Dibayar" : isPending ? "Menunggu Pembayaran" : "Dibatalkan"}
                </span>
              </div>

              <hr className="border-slate-100" />

              {txn.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.name || item.package_name}</p>
                    <p className="text-xs text-slate-400">
                      {item.type === 'menu'
                        ? `${item.category || 'Menu'} · ${item.order_type === 'event' ? 'Acara' : 'Coba Menu'}${item.event_date ? ` · ${item.event_date}${item.event_time ? ` ${item.event_time}` : ''}` : ''} · x${item.quantity}`
                        : `${item.duration} · ${item.meal_type} · x${item.quantity}`}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-700">Rp{formatRupiah(item.price * item.quantity)}</p>
                </div>
              ))}

              <hr className="border-slate-100" />

              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Total</span>
                <span className="text-xl font-black text-[#114C2A]">Rp{formatRupiah(txn.total)}</span>
              </div>
              {txn.payment_option === 'dp' && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-1 text-sm">
                  <div className="flex justify-between font-bold text-amber-800">
                    <span>DP {txn.dp_percentage}% dibayar</span>
                    <span>Rp{formatRupiah(txn.dp_amount || txn.pay_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-amber-700">
                    <span>Sisa tagihan</span>
                    <span>{txn.is_remaining_paid ? 'Lunas' : `Rp${formatRupiah(txn.remaining_amount || 0)}`}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Link
            href="/account/orders"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#114C2A] text-white rounded-xl font-bold shadow-lg hover:bg-[#1a663a] hover:shadow-xl transition-all duration-300"
          >
            Lihat Pesanan Saya <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:border-[#114C2A] hover:text-[#114C2A] transition-all duration-300"
          >
            <Home className="w-4 h-4" /> Kembali ke Beranda
          </Link>
        </div>
      </div>

      {/* Custom animation */}
      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#114C2A]" />
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
