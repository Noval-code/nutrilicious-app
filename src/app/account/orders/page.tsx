"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  CreditCard,
  ExternalLink,
} from "lucide-react";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ""}/api`;

interface OrderItem {
  type?: 'package' | 'menu';
  name?: string;
  category?: string;
  order_type?: string;
  event_date?: string;
  event_time?: string;
  package_name: string;
  duration: string;
  meal_type: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface MenuSummary {
  menu_id: string;
  title: string;
  category: string;
  items?: string[];
}

interface MenuOption {
  _id: string;
  title: string;
  category: string;
}

interface Order {
  _id: string;
  order_id: string;
  items: OrderItem[];
  total: number;
  payment_option?: 'full' | 'dp';
  dp_percentage?: number;
  dp_amount?: number;
  remaining_amount?: number;
  pay_amount?: number;
  is_remaining_paid?: boolean;
  remaining_xendit_invoice_url?: string;
  remaining_payment_status?: string;
  status: string;
  payment_method: string;
  payment_status: string;
  xendit_invoice_url: string;
  created_at: string;
  updated_at: string;
  customer_notes: string;
}

interface DeliveryLog {
  _id: string;
  order_id: string;
  delivery_type?: 'subscription' | 'single_menu' | 'event';
  item_name?: string;
  package_name: string;
  duration: string;
  meal_type: string;
  delivery_day: number;
  total_days: number;
  delivery_date: string;
  status: string;
  recipient_status: string;
  receiver_name?: string;
  delivery_proof_url?: string;
  delivery_note?: string;
  event_time?: string;
  default_menus?: Record<'lunch' | 'dinner', MenuSummary | undefined>;
  custom_menus?: Record<'lunch' | 'dinner', (MenuSummary & { original_menu_title?: string }) | undefined>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType; description: string }> = {
  pending_payment: {
    label: "Menunggu Pembayaran",
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    icon: CreditCard,
    description: "Silakan selesaikan pembayaran untuk memproses pesanan Anda.",
  },
  pending: {
    label: "Menunggu Konfirmasi",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: Clock,
    description: "Pesanan Anda sedang menunggu konfirmasi dari tim kami.",
  },
  confirmed: {
    label: "Dikonfirmasi",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: CheckCircle2,
    description: "Pesanan sudah dikonfirmasi dan akan segera diproses.",
  },
  processing: {
    label: "Sedang Diproses",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    icon: Package,
    description: "Tim dapur sedang menyiapkan pesanan Anda.",
  },
  delivered: {
    label: "Terkirim",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: Truck,
    description: "Pesanan telah berhasil dikirim. Selamat menikmati!",
  },
  cancelled: {
    label: "Dibatalkan",
    color: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: XCircle,
    description: "Pesanan ini telah dibatalkan.",
  },
};

function formatCurrency(val: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
}

const DELIVERY_LABELS: Record<string, string> = {
  pending: "Menunggu",
  prepared: "Disiapkan",
  on_delivery: "Dikirim",
  delivered: "Terkirim",
  received: "Diterima",
  failed: "Gagal",
};

const MEAL_SLOT_LABELS: Record<'lunch' | 'dinner', string> = {
  lunch: 'Lunch',
  dinner: 'Dinner',
};

function getMealSlots(mealType: string): ('lunch' | 'dinner')[] {
  if (mealType === 'Lunch') return ['lunch'];
  if (mealType === 'Dinner') return ['dinner'];
  if (mealType === 'Lunch & Dinner') return ['lunch', 'dinner'];
  return [];
}

function getPackageMealType(order: Order, log: DeliveryLog) {
  if (log.meal_type) return log.meal_type;
  const packageItem = order.items.find(item => item.type !== 'menu' && item.package_name === log.package_name);
  return packageItem?.meal_type || '';
}

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
  const [menus, setMenus] = useState<MenuOption[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [changingMenuKey, setChangingMenuKey] = useState<string | null>(null);
  const [menuChangeTarget, setMenuChangeTarget] = useState<{ log: DeliveryLog; slot: 'lunch' | 'dinner' } | null>(null);
  const [selectedMenuId, setSelectedMenuId] = useState('');
  const [creatingRemainingInvoice, setCreatingRemainingInvoice] = useState(false);
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["pending_payment"];
  const StatusIcon = cfg.icon;

  // Progress steps
  const steps = ["pending_payment", "confirmed", "processing", "delivered"];
  const currentStep = steps.indexOf(order.status);
  const isCancelled = order.status === "cancelled";
  const isPendingPayment = order.status === "pending_payment";

  useEffect(() => {
    if (!expanded || deliveryLogs.length > 0) return;
    async function fetchDeliveryLogs() {
      setLoadingLogs(true);
      try {
        const res = await authFetch(`${API_URL}/delivery-logs/my-logs?order_id=${order.order_id}`);
        if (res.ok) setDeliveryLogs(await res.json());
      } finally {
        setLoadingLogs(false);
      }
    }
    fetchDeliveryLogs();
  }, [expanded, deliveryLogs.length, order.order_id]);

  useEffect(() => {
    if (!expanded || menus.length > 0) return;
    async function fetchMenus() {
      const res = await fetch(`${API_URL}/menus/?available=true`);
      if (res.ok) setMenus(await res.json());
    }
    fetchMenus();
  }, [expanded, menus.length]);

  const confirmReceived = async (log: DeliveryLog) => {
    setConfirmingId(log._id);
    try {
      const res = await authFetch(`${API_URL}/delivery-logs/${log._id}/confirm-received`, {
        method: 'PUT',
        body: JSON.stringify({ receiver_name: '' }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDeliveryLogs(prev => prev.map(item => item._id === log._id ? updated : item));
      }
    } finally {
      setConfirmingId(null);
    }
  };

  const requestMenuChange = async (log: DeliveryLog, mealSlot: 'lunch' | 'dinner', menuId: string) => {
    if (!menuId) return;
    const key = `${log._id}-${mealSlot}`;
    setChangingMenuKey(key);
    try {
      const res = await authFetch(`${API_URL}/delivery-logs/${log._id}/request-menu-change`, {
        method: 'PUT',
        body: JSON.stringify({ meal_slot: mealSlot, menu_id: menuId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDeliveryLogs(prev => prev.map(item => item._id === log._id ? updated : item));
        setMenuChangeTarget(null);
        setSelectedMenuId('');
      }
    } finally {
      setChangingMenuKey(null);
    }
  };

  const openMenuChange = (log: DeliveryLog, slot: 'lunch' | 'dinner') => {
    setMenuChangeTarget({ log, slot });
    setSelectedMenuId(log.custom_menus?.[slot]?.menu_id || '');
  };

  const closeMenuChange = () => {
    setMenuChangeTarget(null);
    setSelectedMenuId('');
  };

  const handlePayRemaining = async () => {
    setCreatingRemainingInvoice(true);
    try {
      const res = await authFetch(`${API_URL}/transactions/${order._id}/remaining-invoice`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        if (updated.remaining_xendit_invoice_url) {
          window.location.href = updated.remaining_xendit_invoice_url;
        }
      }
    } finally {
      setCreatingRemainingInvoice(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${isCancelled ? "border-red-100 opacity-75" : "border-slate-100"}`}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center`}>
            <StatusIcon className={`w-5 h-5 ${cfg.color}`} />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">{order.order_id}</p>
            <p className="text-xs text-slate-400">{formatDate(order.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-black text-slate-800 text-sm">{formatCurrency(order.total)}</p>
            {order.payment_option === 'dp' && <p className="text-[10px] font-bold text-amber-600">DP {order.dp_percentage}%</p>}
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${cfg.color}`}>
              <StatusIcon className="w-3 h-3" />
              {cfg.label}
            </span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-slate-100 animate-in slide-in-from-top-1 duration-200">
          {/* Progress Tracker (not shown for cancelled) */}
          {!isCancelled && (
            <div className="px-5 py-4 bg-slate-50/50">
              <div className="flex items-center justify-between relative">
                {/* Progress Line */}
                <div className="absolute top-4 left-5 right-5 h-0.5 bg-slate-200 z-0" />
                <div
                  className="absolute top-4 left-5 h-0.5 bg-[#005D33] z-0 transition-all duration-500"
                  style={{ width: `${Math.max(0, (currentStep / (steps.length - 1)) * (100 - 10))}%` }}
                />

                {steps.map((step, idx) => {
                  const stepCfg = STATUS_CONFIG[step];
                  const StepIcon = stepCfg.icon;
                  const isDone = idx <= currentStep;
                  return (
                    <div key={step} className="relative z-10 flex flex-col items-center gap-1.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isDone
                            ? "bg-[#005D33] text-white shadow-sm"
                            : "bg-white border-2 border-slate-200 text-slate-300"
                        }`}
                      >
                        <StepIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-[10px] font-bold ${isDone ? "text-[#005D33]" : "text-slate-300"}`}>
                        {stepCfg.label.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className={`text-xs font-medium mt-3 text-center ${cfg.color}`}>{cfg.description}</p>
            </div>
          )}

          {isCancelled && (
            <div className="px-5 py-3 bg-red-50/50">
              <p className="text-xs font-medium text-red-500 text-center">{cfg.description}</p>
            </div>
          )}

          {/* Items */}
          <div className="divide-y divide-slate-50">
            {order.items.map((item, idx) => (
              <div key={idx} className="px-5 py-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 truncate">{item.name || item.package_name || "Paket"}</p>
                  <div className="flex gap-2 mt-0.5">
                    {item.type === 'menu' ? (
                      <>
                        {item.category && <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{item.category}</span>}
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{item.order_type === 'event' ? 'Acara' : 'Coba Menu'}</span>
                        {item.event_date && <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{item.event_date}{item.event_time ? ` ${item.event_time}` : ''}</span>}
                      </>
                    ) : (
                      <>
                        {item.duration && <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{item.duration}</span>}
                        {item.meal_type && <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{item.meal_type}</span>}
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right ml-3">
                  <p className="text-xs text-slate-400 font-semibold">{item.quantity}x</p>
                  <p className="font-bold text-sm text-slate-800">{formatCurrency(item.subtotal)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pay Now Button for pending_payment */}
          {isPendingPayment && order.xendit_invoice_url && (
            <div className="px-5 py-3 bg-orange-50/50 border-t border-orange-100">
              <a
                href={order.xendit_invoice_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#005D33] text-white rounded-xl font-bold shadow-md hover:bg-[#007a44] hover:shadow-lg transition-all"
              >
                <CreditCard className="w-4 h-4" />
                Bayar Sekarang
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {order.payment_option === 'dp' && (
            <div className="px-5 py-3 bg-amber-50/60 border-t border-amber-100 text-sm space-y-1">
              <div className="flex justify-between font-bold text-amber-800">
                <span>DP dibayar</span>
                <span>{formatCurrency(order.dp_amount || order.pay_amount || 0)}</span>
              </div>
              <div className="flex justify-between font-semibold text-amber-700">
                <span>Sisa tagihan</span>
                <span>{order.is_remaining_paid ? 'Lunas' : formatCurrency(order.remaining_amount || 0)}</span>
              </div>
              {!order.is_remaining_paid && order.status !== 'cancelled' && (
                <button
                  onClick={handlePayRemaining}
                  disabled={creatingRemainingInvoice}
                  className="w-full mt-2 py-2.5 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creatingRemainingInvoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  Bayar Sisa Tagihan
                </button>
              )}
            </div>
          )}

          {(loadingLogs || deliveryLogs.length > 0) && (
            <div className="px-5 py-3 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Log Pengiriman Langganan</h3>
              {loadingLogs ? (
                <div className="text-xs text-slate-400 font-semibold flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Memuat log pengiriman...</div>
              ) : (
                <div className="space-y-2">
                  {deliveryLogs.map(log => {
                    const mealType = getPackageMealType(order, log);
                    return (
                    <div key={log._id} className="bg-slate-50 rounded-xl p-3 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-sm text-slate-700">Hari {log.delivery_day}/{log.total_days} · {formatShortDate(log.delivery_date)}</p>
                        {log.delivery_type && log.delivery_type !== 'subscription' && (
                          <p className="text-xs text-slate-400">{log.item_name || log.package_name}{log.event_time ? ` · ${log.event_time}` : ''}</p>
                        )}
                      </div>
                      {log.status === 'delivered' && log.recipient_status !== 'confirmed' ? (
                        <button
                          onClick={() => confirmReceived(log)}
                          disabled={confirmingId === log._id}
                          className="px-3 py-2 bg-[#005D33] text-white rounded-lg text-xs font-bold disabled:opacity-50"
                        >
                          {confirmingId === log._id ? 'Memproses...' : 'Konfirmasi Diterima'}
                        </button>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${log.status === 'received' ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-400'}`}>
                          {log.status === 'received' ? 'Sudah diterima' : DELIVERY_LABELS[log.status] || log.status}
                        </span>
                      )}
                      </div>
                      {getMealSlots(mealType).length > 0 && (
                        <div className="space-y-2 border-t border-white pt-2">
                          {getMealSlots(mealType).map(slot => {
                            const defaultMenu = log.default_menus?.[slot];
                            const customMenu = log.custom_menus?.[slot];
                            const currentTitle = customMenu?.title || defaultMenu?.title || 'Menu belum tersedia';
                            return (
                              <div key={slot} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-700 truncate">
                                    {currentTitle}
                                    {customMenu && <span className="ml-1 text-[#005D33]">(Custom)</span>}
                                  </p>
                                  {customMenu?.original_menu_title && <p className="text-[10px] text-slate-400">Default: {customMenu.original_menu_title}</p>}
                                </div>
                                {log.status === 'pending' && (
                                  <button
                                    onClick={() => openMenuChange(log, slot)}
                                    className="bg-white border border-[#005D33]/20 text-[#005D33] rounded-lg px-3 py-1.5 text-xs font-bold hover:bg-[#f0f7f4] transition-colors"
                                  >
                                    Ganti Menu
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {(log.delivery_proof_url || log.delivery_note) && (
                        <div className="border-t border-white pt-2 text-xs space-y-1">
                          {log.delivery_proof_url && (
                            <a href={log.delivery_proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-[#005D33] hover:underline">
                              <ExternalLink className="w-3 h-3" /> Lihat Bukti Pengiriman
                            </a>
                          )}
                          {log.delivery_note && <p className="text-slate-500">Catatan: {log.delivery_note}</p>}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {menuChangeTarget && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={closeMenuChange}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">Ganti Menu {MEAL_SLOT_LABELS[menuChangeTarget.slot]}</h3>
                  <p className="text-xs text-slate-400 mt-1">Hari {menuChangeTarget.log.delivery_day}/{menuChangeTarget.log.total_days} · {formatShortDate(menuChangeTarget.log.delivery_date)}</p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 text-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Menu Saat Ini</p>
                  <p className="font-bold text-slate-700 mt-1">
                    {menuChangeTarget.log.custom_menus?.[menuChangeTarget.slot]?.title || menuChangeTarget.log.default_menus?.[menuChangeTarget.slot]?.title || 'Menu belum tersedia'}
                  </p>
                  {menuChangeTarget.log.custom_menus?.[menuChangeTarget.slot]?.original_menu_title && (
                    <p className="text-xs text-slate-400 mt-1">Default: {menuChangeTarget.log.custom_menus[menuChangeTarget.slot]?.original_menu_title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Pilih Menu Pengganti</label>
                  <select
                    value={selectedMenuId}
                    onChange={(e) => setSelectedMenuId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#F9A826]"
                  >
                    <option value="">Pilih menu</option>
                    {menus.filter(menu => menu.category === menuChangeTarget.slot).map(menu => (
                      <option key={menu._id} value={menu._id}>{menu.title}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={closeMenuChange}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => requestMenuChange(menuChangeTarget.log, menuChangeTarget.slot, selectedMenuId)}
                    disabled={!selectedMenuId || changingMenuKey === `${menuChangeTarget.log._id}-${menuChangeTarget.slot}`}
                    className="flex-1 py-2.5 rounded-xl bg-[#005D33] text-white font-bold text-sm disabled:opacity-50"
                  >
                    {changingMenuKey === `${menuChangeTarget.log._id}-${menuChangeTarget.slot}` ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-5 py-3 bg-slate-50 flex items-center justify-between">
            <div className="text-xs text-slate-400 font-medium">
              {order.payment_method ? (
                <>Metode: <span className="text-slate-600 capitalize">{order.payment_method}</span></>
              ) : (
                <span className="text-slate-400 italic">Belum ada metode pembayaran</span>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-medium">Total: </span>
              <span className="font-black text-[#005D33]">{formatCurrency(order.total)}</span>
            </div>
          </div>

          {order.customer_notes && (
            <div className="px-5 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-400 font-semibold">Catatan:</p>
              <p className="text-sm text-slate-600 italic">{order.customer_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyOrdersPage() {
  const { user, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    async function fetchOrders() {
      if (!user?.id) return;
      try {
        const res = await authFetch(`${API_URL}/transactions/my-orders`);
        if (res.ok) setOrders(await res.json());
      } catch (err) {
        console.error("Gagal memuat pesanan:", err);
      } finally {
        setLoading(false);
      }
    }
    if (isLoaded && isSignedIn) fetchOrders();
  }, [isLoaded, isSignedIn, user]);

  const filtered = filterStatus === "all" ? orders : orders.filter((o) => o.status === filterStatus);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const statusFilters = [
    { key: "all", label: "Semua" },
    { key: "pending_payment", label: "Belum Bayar" },
    { key: "confirmed", label: "Konfirmasi" },
    { key: "processing", label: "Diproses" },
    { key: "delivered", label: "Terkirim" },
    { key: "cancelled", label: "Batal" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#005D33] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Beranda
        </Link>

        <h1 className="text-3xl font-extrabold text-[#005D33] mb-2">Pesanan Saya</h1>
        <p className="text-slate-500 text-sm mb-8">
          Pantau status dan riwayat seluruh pesanan Anda.
        </p>

        {/* Status Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {statusFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                filterStatus === f.key
                  ? "bg-[#005D33] text-white shadow-md"
                  : "bg-white text-slate-500 border border-slate-200 hover:border-[#005D33] hover:text-[#005D33]"
              }`}
            >
              {f.label}
              {f.key !== "all" && (
                <span className={`ml-1.5 text-[10px] ${filterStatus === f.key ? "text-white/60" : "text-slate-300"}`}>
                  {orders.filter((o) => o.status === f.key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="font-semibold text-sm">Memuat pesanan...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-600">Belum Ada Pesanan</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-sm">
              {filterStatus === "all"
                ? "Anda belum membuat pesanan. Yuk, mulai pesan paket makan sehat!"
                : "Tidak ada pesanan dengan status ini."}
            </p>
            {filterStatus === "all" && (
              <Link
                href="/"
                className="mt-4 bg-[#005D33] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#007a44] transition-colors shadow-md inline-flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" /> Lihat Menu
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Total Pengeluaran Summary */}
            {filterStatus === "all" && orders.length > 0 && (
              <div className="bg-gradient-to-r from-[#005D33] to-[#007a44] rounded-2xl p-5 text-white shadow-lg mb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-1">Total Pengeluaran</p>
                    <p className="text-2xl font-black tracking-tight">
                      {formatCurrency(orders.reduce((sum, o) => sum + (o.total || 0), 0))}
                    </p>
                    <p className="text-xs text-white/60 mt-1">{orders.length} pesanan · semua status</p>
                  </div>
                  <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center">
                    <ShoppingBag className="w-7 h-7 text-white" />
                  </div>
                </div>
              </div>
            )}
            {filtered.map((order) => (
              <OrderCard key={order._id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
