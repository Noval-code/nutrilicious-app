"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Brain,
  Loader2, AlertCircle, CheckCircle2, ArrowLeft,
  Package, Leaf, Dumbbell, Salad, Info, ChevronDown, ChevronRight, Boxes,
  UtensilsCrossed, Moon, Sun
} from 'lucide-react';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ''}/api`;

// ============================================================
// TYPES
// ============================================================

interface Metrics {
  mae: number;
  rmse: number;
  r2: number;
  trained_at: string;
  train_size: number;
  test_size: number;
  best_params: Record<string, unknown>;
  feature_importance: FeatureImportance[];
}

interface FeatureImportance {
  feature: string;
  label: string;
  importance: number;
  importance_pct: number;
}

interface Prediction {
  package_slug: string;
  package_name: string;
  predicted_orders: number;
}

interface ForecastResult {
  predictions: Prediction[];
  week_label: string;
  week_start: string;
  week_end: string;
}

interface HistoryItem {
  week: string;
  week_start: string;
  package_slug: string;
  package_name: string;
  order_count: number;
}

interface TestResult {
  year_week: string;
  week_start: string;
  package_slug: string;
  package_name: string;
  order_count: number;
  predicted: number;
}

interface MaterialItem {
  name: string;
  quantity: number;
  unit: string;
  meal_type: string;
}

interface DailyBreakdown {
  day_number: number;
  day_name: string;
  lunch_menu: string;
  dinner_menu: string;
  materials: MaterialItem[];
}

interface TotalMaterial {
  name: string;
  total_quantity: number;
  unit: string;
}

interface PackageMaterialForecast {
  package_slug: string;
  package_name: string;
  predicted_orders: number;
  orders_per_day: number;
  has_schedule: boolean;
  daily_breakdown: DailyBreakdown[];
  total_materials: TotalMaterial[];
}

interface MaterialForecastResult {
  week_label: string;
  week_start: string;
  week_end: string;
  packages: PackageMaterialForecast[];
}

// ============================================================
// CONSTANTS
// ============================================================

const PACKAGE_COLORS: Record<string, { primary: string; bg: string; border: string; line: string }> = {
  'healthy-food': {
    primary: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    line: '#059669',
  },
  'low-carbs': {
    primary: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    line: '#d97706',
  },
  'muscle-gain': {
    primary: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    line: '#2563eb',
  },
};

const PACKAGE_ICONS: Record<string, React.ElementType> = {
  'healthy-food': Salad,
  'low-carbs': Leaf,
  'muscle-gain': Dumbbell,
};






// ============================================================
// MATERIAL FORECAST SECTION
// ============================================================

function MaterialForecastSection({ materialForecast }: { materialForecast: MaterialForecastResult }) {
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<Record<string, number | null>>({});

  const togglePkg = (slug: string) => {
    setExpandedPkg(prev => prev === slug ? null : slug);
  };

  const toggleDay = (pkgSlug: string, dayNum: number) => {
    setExpandedDay(prev => ({
      ...prev,
      [pkgSlug]: prev[pkgSlug] === dayNum ? null : dayNum,
    }));
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-sm">
          <Boxes className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">Prediksi Kebutuhan Bahan Baku</h2>
          <p className="text-sm text-slate-500">
            Periode: {formatDate(materialForecast.week_start)} — {formatDate(materialForecast.week_end)}
          </p>
        </div>
      </div>


      <div className="space-y-4">
        {materialForecast.packages.map((pkg) => {
          const colors = PACKAGE_COLORS[pkg.package_slug] || PACKAGE_COLORS['healthy-food'];
          const Icon = PACKAGE_ICONS[pkg.package_slug] || Package;
          const isExpanded = expandedPkg === pkg.package_slug;

          return (
            <div
              key={pkg.package_slug}
              className={`bg-white rounded-3xl shadow-sm border ${colors.border} overflow-hidden transition-all`}
            >
              {/* Package Header */}
              <button
                onClick={() => togglePkg(pkg.package_slug)}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${colors.bg} rounded-2xl flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${colors.primary}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{pkg.package_name}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-sm text-slate-500">
                        Prediksi: <span className="font-black text-slate-800">{pkg.predicted_orders}</span> pesanan/minggu
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {pkg.has_schedule && (
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${colors.bg} ${colors.primary}`}>
                      {pkg.total_materials.length} bahan
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                  {!pkg.has_schedule ? (
                    <div className="p-6 text-center">
                      <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-600">Jadwal menu belum di-set untuk paket ini</p>
                      <p className="text-xs text-slate-400 mt-1">Silakan atur jadwal menu terlebih dahulu</p>
                    </div>
                  ) : (
                    <div className="p-5 space-y-5">
                      {/* Total Materials Table */}
                      <div>
                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                          <Boxes className="w-4 h-4 text-amber-500" />
                          Total Kebutuhan Bahan Baku (1 Minggu)
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-50 rounded-lg">
                                <th className="text-left py-2.5 px-4 font-bold text-slate-500 text-xs uppercase tracking-wide rounded-l-lg">No</th>
                                <th className="text-left py-2.5 px-4 font-bold text-slate-500 text-xs uppercase tracking-wide">Bahan Baku</th>
                                <th className="text-right py-2.5 px-4 font-bold text-slate-500 text-xs uppercase tracking-wide">Kebutuhan</th>
                                <th className="text-left py-2.5 px-4 font-bold text-slate-500 text-xs uppercase tracking-wide rounded-r-lg">Satuan</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pkg.total_materials.map((mat, idx) => (
                                <tr key={`${mat.name}-${idx}`} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                  <td className="py-2.5 px-4 text-slate-400 font-semibold">{idx + 1}</td>
                                  <td className="py-2.5 px-4 font-semibold text-slate-700 capitalize">{mat.name}</td>
                                  <td className="py-2.5 px-4 text-right font-black text-slate-800 tabular-nums">
                                    {mat.total_quantity.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                                  </td>
                                  <td className="py-2.5 px-4 text-slate-500">{mat.unit}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Daily Breakdown */}
                      <div>
                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                          <UtensilsCrossed className="w-4 h-4 text-emerald-500" />
                          Detail Per Hari
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {pkg.daily_breakdown.map((day) => {
                            const isDayExpanded = expandedDay[pkg.package_slug] === day.day_number;
                            return (
                              <div
                                key={day.day_number}
                                className={`border rounded-2xl overflow-hidden transition-all ${isDayExpanded ? 'border-slate-300 shadow-sm' : 'border-slate-100'}`}
                              >
                                <button
                                  onClick={() => toggleDay(pkg.package_slug, day.day_number)}
                                  className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors text-left"
                                >
                                  <div>
                                    <span className="text-sm font-bold text-slate-700">
                                      {day.day_name}
                                    </span>
                                    <span className="text-xs text-slate-400 ml-1.5">Hari {day.day_number}</span>
                                  </div>
                                  {isDayExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                  )}
                                </button>

                                {isDayExpanded && (
                                  <div className="border-t border-slate-100 p-3 space-y-3 animate-in fade-in duration-200">
                                    {/* Lunch */}
                                    {day.lunch_menu && (
                                      <div>
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                                          <span className="text-xs font-bold text-amber-600 uppercase">Lunch</span>
                                        </div>
                                        <p className="text-xs font-semibold text-slate-600 mb-1.5 pl-5">{day.lunch_menu}</p>
                                        <div className="pl-5 space-y-0.5">
                                          {day.materials
                                            .filter(m => m.meal_type === 'lunch')
                                            .map((m, i) => (
                                              <div key={i} className="flex justify-between text-xs">
                                                <span className="text-slate-500 capitalize">{m.name}</span>
                                                <span className="font-semibold text-slate-700 tabular-nums">
                                                  {m.quantity.toLocaleString('id-ID', { maximumFractionDigits: 1 })} {m.unit}
                                                </span>
                                              </div>
                                            ))
                                          }
                                        </div>
                                      </div>
                                    )}

                                    {/* Dinner */}
                                    {day.dinner_menu && (
                                      <div>
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                          <Moon className="w-3.5 h-3.5 text-indigo-500" />
                                          <span className="text-xs font-bold text-indigo-600 uppercase">Dinner</span>
                                        </div>
                                        <p className="text-xs font-semibold text-slate-600 mb-1.5 pl-5">{day.dinner_menu}</p>
                                        <div className="pl-5 space-y-0.5">
                                          {day.materials
                                            .filter(m => m.meal_type === 'dinner')
                                            .map((m, i) => (
                                              <div key={i} className="flex justify-between text-xs">
                                                <span className="text-slate-500 capitalize">{m.name}</span>
                                                <span className="font-semibold text-slate-700 tabular-nums">
                                                  {m.quantity.toLocaleString('id-ID', { maximumFractionDigits: 1 })} {m.unit}
                                                </span>
                                              </div>
                                            ))
                                          }
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

export default function PredictionPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);

  const [isTraining, setIsTraining] = useState(false);
  const [materialForecast, setMaterialForecast] = useState<MaterialForecastResult | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [trainMessage, setTrainMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getHeaders = () => {
    const token = localStorage.getItem('nutrilicious_admin_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    try {
      const headers = getHeaders();
      const [accRes, foreRes, matRes] = await Promise.all([
        fetch(`${API_URL}/prediction/accuracy`, { headers }).catch(() => null),
        fetch(`${API_URL}/prediction/forecast`, { headers }).catch(() => null),
        fetch(`${API_URL}/prediction/material-forecast`, { headers }).catch(() => null),
      ]);

      if (accRes?.ok) {
        const data = await accRes.json();
        setMetrics(data);
      }
      if (foreRes?.ok) setForecast(await foreRes.json());
      if (matRes?.ok) {
        const matData = await matRes.json();
        setMaterialForecast(matData);
      }
    } catch (err) {
      console.error('Failed to fetch prediction data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Train model
  const handleTrain = async () => {
    setIsTraining(true);
    setTrainMessage(null);

    try {
      const headers = getHeaders();
      headers['Content-Type'] = 'application/json';

      const res = await fetch(`${API_URL}/prediction/train`, {
        method: 'POST',
        headers,
      });

      const data = await res.json();

      if (res.ok) {
        setTrainMessage({ type: 'success', text: 'Prediksi berhasil dilakukan!' });
        // Refresh all data
        await fetchAllData();
      } else {
        setTrainMessage({ type: 'error', text: data.error || 'Training gagal' });
      }
    } catch (err) {
      setTrainMessage({ type: 'error', text: 'Gagal terhubung ke server' });
    } finally {
      setIsTraining(false);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#114C2A] mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Memuat data prediksi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/admin" className="text-slate-400 hover:text-[#114C2A] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-extrabold text-[#114C2A] tracking-tight">Prediksi Penjualan</h1>
          </div>
          <p className="text-slate-500 mt-1">
            Prediksi jumlah pesanan per paket.
          </p>
        </div>

        <button
          id="btn-train-model"
          onClick={handleTrain}
          disabled={isTraining}
          className="flex items-center gap-2 px-6 py-3.5 bg-[#114C2A] hover:bg-[#1a663a] text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isTraining ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Memulai Prediksi...
            </>
          ) : (
            <>
              <Brain className="w-5 h-5" />
              Mulai Prediksi
            </>
          )}
        </button>
      </div>

      {/* Training Message */}
      {trainMessage && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
          trainMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        } animate-in fade-in slide-in-from-top-2 duration-300`}>
          {trainMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <p className="font-semibold text-sm">{trainMessage.text}</p>
        </div>
      )}

      {/* No model trained yet - show prompt */}
      {!metrics && (
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-3xl p-10 border border-slate-200 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4">
            <Brain className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">Model Belum Di-training</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
            Klik tombol <strong>&quot;Mulai Prediksi&quot;</strong> di atas untuk melatih model Random Forest dengan data transaksi historis Anda.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
            <Info className="w-4 h-4" />
            <span>Pastikan data transaksi sudah tersedia (jalankan seed terlebih dahulu)</span>
          </div>
        </div>
      )}

      {/* Prediction Cards */}
      {forecast && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-extrabold text-slate-800">Prediksi Minggu Depan</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Periode: {formatDate(forecast.week_start)} — {formatDate(forecast.week_end)}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {forecast.predictions.map((pred) => {
              const colors = PACKAGE_COLORS[pred.package_slug] || PACKAGE_COLORS['healthy-food'];
              const Icon = PACKAGE_ICONS[pred.package_slug] || Package;
              return (
                <div
                  key={pred.package_slug}
                  className={`bg-white rounded-3xl p-6 shadow-sm border ${colors.border} hover:shadow-md transition-all relative overflow-hidden group`}
                >
                  <div className={`absolute top-0 right-0 w-24 h-24 ${colors.bg} rounded-bl-full -mr-4 -mt-4 opacity-60 transition-transform group-hover:scale-110`} />
                  <div className="relative z-10">
                    <div className={`w-12 h-12 ${colors.bg} rounded-2xl flex items-center justify-center mb-4`}>
                      <Icon className={`w-6 h-6 ${colors.primary}`} />
                    </div>
                    <p className="text-sm font-bold text-slate-500 mb-1">{pred.package_name}</p>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-black text-slate-800 tracking-tighter">{pred.predicted_orders}</span>
                      <span className="text-sm font-semibold text-slate-400 pb-1">pesanan</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PREDIKSI KEBUTUHAN BAHAN BAKU */}
      {/* ============================================================ */}
      {materialForecast && materialForecast.packages.length > 0 && (
        <MaterialForecastSection materialForecast={materialForecast} />
      )}

    </div>
  );
}
