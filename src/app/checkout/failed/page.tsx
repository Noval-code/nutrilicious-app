"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { XCircle, RotateCcw, Home, Loader2 } from "lucide-react";

function CheckoutFailedContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-lg text-center">
        {/* Error Icon */}
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-14 h-14 text-red-400" />
        </div>

        <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Pembayaran Gagal</h1>
        <p className="text-slate-500 text-sm mb-2">
          Pembayaran untuk pesanan Anda tidak berhasil atau telah kedaluwarsa.
        </p>
        {orderId && (
          <p className="text-xs font-mono text-slate-400 mb-8">
            Order ID: {orderId}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#114C2A] text-white rounded-xl font-bold shadow-lg hover:bg-[#1a663a] hover:shadow-xl transition-all duration-300"
          >
            <RotateCcw className="w-4 h-4" /> Coba Pesan Lagi
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:border-[#114C2A] hover:text-[#114C2A] transition-all duration-300"
          >
            <Home className="w-4 h-4" /> Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutFailedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#114C2A]" />
      </div>
    }>
      <CheckoutFailedContent />
    </Suspense>
  );
}
