"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Filter, 
  RefreshCw, 
  TrendingUp, 
  Package, 
  Loader2, 
  CreditCard, 
  ChevronDown, 
  CheckCircle2, 
  ArrowUpDown,
  ShoppingBag,
  DollarSign,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ''}/api`;

interface PackageOption {
  _id: string;
  slug: string;
  category: string;
}

interface DailySales {
  date: string;
  revenue: number;
  count: number;
}

interface TopPackage {
  package_slug: string;
  package_name: string;
  quantity: number;
  revenue: number;
}

interface ReportData {
  total_revenue: number;
  orders_count: number;
  total_items_sold: number;
  average_order_value: number;
  top_packages: TopPackage[];
  daily_sales: DailySales[];
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    minimumFractionDigits: 0 
  }).format(val);
}

function formatCompactCurrency(val: number) {
  if (val >= 1_000_000) {
    return (val / 1_000_000).toFixed(1) + ' jt';
  }
  if (val >= 1_000) {
    return (val / 1_000).toFixed(0) + ' rb';
  }
  return val.toString();
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
}

export default function SalesReportPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Default filter dates: 30 days ago to today
  const defaultStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  const defaultEndDate = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [status, setStatus] = useState('active'); // active (default), all, confirmed, etc.
  const [selectedPackage, setSelectedPackage] = useState('all');

  // Chart hover interaction
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Fetch package list for dropdown filter
  useEffect(() => {
    async function fetchPackages() {
      try {
        const res = await fetch(`${API_URL}/packages/`);
        if (res.ok) {
          const data = await res.json();
          setPackages(data);
        }
      } catch (err) {
        console.error('Gagal mengambil daftar paket:', err);
      }
    }
    fetchPackages();
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let url = `${API_URL}/transactions/report?start_date=${startDate}&end_date=${endDate}&status=${status}`;
      if (selectedPackage !== 'all') {
        url += `&package_slug=${selectedPackage}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Gagal memuat laporan penjualan.');
      }
      const data = await res.json();
      setReportData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat memuat data.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, status, selectedPackage]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleResetFilters = () => {
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setStatus('active');
    setSelectedPackage('all');
  };

  // ─── Export Excel ──────────────────────────────────────────────────────
  const handleExportExcel = useCallback(() => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();

    // --- Sheet 1: Ringkasan ---
    const statusLabels: Record<string, string> = {
      active: 'Aktif (Sukses/Bayar)',
      all: 'Semua Transaksi',
      pending_payment: 'Belum Bayar',
      confirmed: 'Dikonfirmasi',
      processing: 'Diproses',
      delivered: 'Terkirim',
      cancelled: 'Dibatalkan',
    };

    const summaryData = [
      ['Laporan Penjualan - Nutrilicious Food'],
      [],
      ['Periode', `${formatDate(startDate)} - ${formatDate(endDate)}`],
      ['Status Filter', statusLabels[status] || status],
      ['Paket Filter', selectedPackage === 'all' ? 'Semua Paket' : selectedPackage],
      [],
      ['Metrik', 'Nilai'],
      ['Total Pendapatan', reportData.total_revenue],
      ['Total Transaksi', reportData.orders_count],
      ['Rata-Rata Transaksi (AOV)', reportData.average_order_value],
      ['Total Porsi Terjual', reportData.total_items_sold],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

    // Set column widths for readability
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 35 }];

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

    // --- Sheet 2: Penjualan Harian ---
    const dailyHeader = ['Tanggal', 'Jumlah Transaksi', 'Pendapatan (Rp)'];
    const dailyRows = [...(reportData.daily_sales || [])]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((d) => [
        formatDate(d.date),
        d.count,
        d.revenue,
      ]);

    const wsDaily = XLSX.utils.aoa_to_sheet([dailyHeader, ...dailyRows]);
    wsDaily['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsDaily, 'Penjualan Harian');

    // --- Sheet 3: Paket Terlaris ---
    const pkgHeader = ['No', 'Nama Paket', 'Jumlah Porsi', 'Pendapatan (Rp)'];
    const pkgRows = (reportData.top_packages || []).map((pkg, idx) => [
      idx + 1,
      pkg.package_name || pkg.package_slug,
      pkg.quantity,
      pkg.revenue,
    ]);

    const wsPkg = XLSX.utils.aoa_to_sheet([pkgHeader, ...pkgRows]);
    wsPkg['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsPkg, 'Paket Terlaris');

    // --- Generate & download ---
    const fileName = `Laporan_Penjualan_${startDate}_sd_${endDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, [reportData, startDate, endDate, status, selectedPackage]);

  // SVG Chart Coordinates calculation
  const chartProps = useMemo(() => {
    if (!reportData || !reportData.daily_sales || reportData.daily_sales.length === 0) return null;
    
    const dailySales = reportData.daily_sales;
    const paddingLeft = 60;
    const paddingRight = 30;
    const paddingTop = 20;
    const paddingBottom = 40;
    
    const width = 800;
    const height = 240;
    
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;
    
    const maxRevenue = Math.max(...dailySales.map(d => d.revenue), 100000);
    const maxCount = Math.max(...dailySales.map(d => d.count), 1);
    
    const points = dailySales.map((d, index) => {
      const x = paddingLeft + (dailySales.length > 1 
        ? (index / (dailySales.length - 1)) * chartWidth 
        : chartWidth / 2
      );
      // y is inverted in SVG coordinate space
      const y = height - paddingBottom - (d.revenue / maxRevenue) * chartHeight;
      return { x, y, date: d.date, revenue: d.revenue, count: d.count };
    });

    // Generate path data for the line chart
    let linePath = '';
    let areaPath = '';
    
    if (points.length > 0) {
      // Line path
      linePath = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        linePath += ` L ${points[i].x} ${points[i].y}`;
      }
      
      // Area path (closed polygon at bottom)
      areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
    }
    
    return {
      width,
      height,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      chartWidth,
      chartHeight,
      maxRevenue,
      maxCount,
      points,
      linePath,
      areaPath
    };
  }, [reportData]);

  // Total Share calculation for top packages list
  const topPackagesWithShare = useMemo(() => {
    if (!reportData || !reportData.top_packages) return [];
    const total = reportData.top_packages.reduce((sum, pkg) => sum + pkg.revenue, 0);
    return reportData.top_packages.map(pkg => ({
      ...pkg,
      share: total > 0 ? (pkg.revenue / total) * 100 : 0
    }));
  }, [reportData]);

  // Date breakdown sorted newest first (for display in detailed table)
  const sortedDailySales = useMemo(() => {
    if (!reportData || !reportData.daily_sales) return [];
    return [...reportData.daily_sales].sort((a, b) => b.date.localeCompare(a.date));
  }, [reportData]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#114C2A] tracking-tight flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-[#F9A826]" />
            Laporan Penjualan
          </h1>
          <p className="text-slate-500 mt-1">
            Analisis detail keuangan, transaksi, dan grafik tren penjualan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {reportData && !loading && (
            <button 
              onClick={handleExportExcel}
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all duration-200 shadow-md cursor-pointer"
            >
              <Download className="w-4 h-4" /> 
              Export Excel
            </button>
          )}
          <button 
            onClick={fetchReport} 
            disabled={loading}
            className="bg-[#114C2A] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#1a663a] transition-all duration-200 shadow-md disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 
            Refresh Data
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 font-bold text-slate-800 mb-4 pb-3 border-b border-gray-50">
          <Filter className="w-4 h-4 text-[#114C2A]" />
          Filter Laporan
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Start Date */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Tanggal Mulai</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-[#114C2A] rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all cursor-pointer"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Tanggal Akhir</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-[#114C2A] rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all cursor-pointer"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Status Transaksi</label>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-[#114C2A] rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="active">Aktif (Sukses/Bayar)</option>
                <option value="all">Semua Transaksi</option>
                <option value="pending_payment">Belum Bayar</option>
                <option value="confirmed">Dikonfirmasi</option>
                <option value="processing">Diproses</option>
                <option value="delivered">Terkirim</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Package Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Paket Langganan</label>
            <div className="relative">
              <select
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-[#114C2A] rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="all">Semua Paket</option>
                {packages.map((pkg) => (
                  <option key={pkg._id} value={pkg.slug}>
                    {pkg.category}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleResetFilters}
            className="text-xs font-bold text-slate-400 hover:text-[#114C2A] hover:bg-[#f2f6f4] px-4 py-2 rounded-xl transition-all duration-200"
          >
            Reset Filter
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 font-bold rounded-2xl text-sm">
          {error}
        </div>
      )}

      {/* Loading Overlay */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 border border-gray-100 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin text-[#114C2A] mb-3" />
          <p className="font-semibold text-sm">Memuat dan menganalisis data penjualan...</p>
        </div>
      ) : reportData ? (
        <>
          {/* Metrics Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pendapatan</p>
                <p className="text-2xl font-black text-[#114C2A] tracking-tight">{formatCurrency(reportData.total_revenue)}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <DollarSign className="w-6 h-6 text-[#114C2A]" />
              </div>
            </div>

            {/* Orders Count */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Transaksi</p>
                <p className="text-2xl font-black text-slate-800 tracking-tight">{reportData.orders_count} Pesanan</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            {/* Average Order Value */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rata-Rata Transaksi (AOV)</p>
                <p className="text-2xl font-black text-slate-800 tracking-tight">{formatCurrency(reportData.average_order_value)}</p>
              </div>
              <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <CreditCard className="w-6 h-6 text-violet-600" />
              </div>
            </div>

            {/* Total Items Sold */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Porsi Terjual</p>
                <p className="text-2xl font-black text-slate-800 tracking-tight">{reportData.total_items_sold} Paket</p>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <Package className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          {/* Chart Trend Card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
              <div>
                <h3 className="font-extrabold text-lg text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="w-5 h-5 text-[#114C2A]" />
                  Tren Grafik Pendapatan
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Representasi pendapatan harian untuk periode terpilih.</p>
              </div>

              {/* Live Info Tooltip */}
              {hoveredIndex !== null && chartProps && chartProps.points[hoveredIndex] && (
                <div className="bg-[#114C2A] text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-3 shadow-md animate-in fade-in duration-100">
                  <span>{formatDate(chartProps.points[hoveredIndex].date)}</span>
                  <span className="w-px h-3 bg-white/30" />
                  <span className="text-[#F9A826]">{formatCurrency(chartProps.points[hoveredIndex].revenue)}</span>
                  <span className="text-white/60">({chartProps.points[hoveredIndex].count} order)</span>
                </div>
              )}
            </div>

            {/* SVG Interactive Area Chart */}
            <div className="w-full overflow-hidden">
              {chartProps && chartProps.points.length > 0 ? (
                <div className="relative">
                  <svg 
                    viewBox={`0 0 ${chartProps.width} ${chartProps.height}`} 
                    className="w-full h-auto"
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <defs>
                      <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#114C2A" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#114C2A" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    {[0, 1, 2, 3].map((g) => {
                      const yGrid = chartProps.paddingTop + (g / 3) * chartProps.chartHeight;
                      const gridVal = chartProps.maxRevenue - (g / 3) * chartProps.maxRevenue;
                      return (
                        <g key={g}>
                          <line
                            x1={chartProps.paddingLeft}
                            y1={yGrid}
                            x2={chartProps.width - chartProps.paddingRight}
                            y2={yGrid}
                            stroke="#f1f5f9"
                            strokeWidth="1.5"
                          />
                          <text
                            x={chartProps.paddingLeft - 8}
                            y={yGrid + 4}
                            textAnchor="end"
                            fill="#94a3b8"
                            fontSize="10"
                            fontWeight="bold"
                          >
                            {formatCompactCurrency(gridVal)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Gradient Area Path */}
                    <path
                      d={chartProps.areaPath}
                      fill="url(#chart-area-grad)"
                    />

                    {/* Main Line Path */}
                    <path
                      d={chartProps.linePath}
                      fill="none"
                      stroke="#114C2A"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Data Points and Hover Triggers */}
                    {chartProps.points.map((p, idx) => (
                      <g key={idx}>
                        {/* Dot circle (visible) */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={hoveredIndex === idx ? "7" : "4.5"}
                          fill={hoveredIndex === idx ? "#F9A826" : "#114C2A"}
                          stroke="white"
                          strokeWidth="2.5"
                          className="transition-all duration-150"
                        />

                        {/* Hover bar overlay */}
                        {hoveredIndex === idx && (
                          <line
                            x1={p.x}
                            y1={chartProps.paddingTop}
                            x2={p.x}
                            y2={chartProps.height - chartProps.paddingBottom}
                            stroke="#114C2A"
                            strokeWidth="1.5"
                            strokeDasharray="4 3"
                            opacity="0.3"
                          />
                        )}

                        {/* Transparent capture rectangle for hover trigger */}
                        <rect
                          x={p.x - (chartProps.chartWidth / chartProps.points.length) / 2}
                          y={chartProps.paddingTop}
                          width={chartProps.chartWidth / chartProps.points.length}
                          height={chartProps.chartHeight}
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredIndex(idx)}
                        />
                      </g>
                    ))}

                    {/* X-axis Line */}
                    <line
                      x1={chartProps.paddingLeft}
                      y1={chartProps.height - chartProps.paddingBottom}
                      x2={chartProps.width - chartProps.paddingRight}
                      y2={chartProps.height - chartProps.paddingBottom}
                      stroke="#cbd5e1"
                      strokeWidth="1.5"
                    />

                    {/* X-axis Labels (Skip logic to avoid clutter) */}
                    {chartProps.points.map((p, idx) => {
                      const totalPoints = chartProps.points.length;
                      const labelInterval = Math.max(Math.ceil(totalPoints / 6), 1);
                      if (idx % labelInterval !== 0 && idx !== totalPoints - 1) return null;
                      
                      return (
                        <text
                          key={idx}
                          x={p.x}
                          y={chartProps.height - chartProps.paddingBottom + 18}
                          textAnchor="middle"
                          fill="#94a3b8"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          {new Date(p.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </text>
                      );
                    })}
                  </svg>
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-gray-200">
                  <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="font-semibold text-sm">Tidak ada data tren penjualan.</p>
                  <p className="text-xs text-slate-400">Pilih rentang tanggal lain atau bersihkan filter.</p>
                </div>
              )}
            </div>
          </div>

          {/* Grid Layout for Top Selling and Detailed Table */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* Left side: Top Products (2/5 size) */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm lg:col-span-2">
              <h3 className="font-extrabold text-lg text-slate-800 flex items-center gap-1.5 mb-4">
                <Package className="w-5 h-5 text-amber-500" />
                Paket Katering Terlaris
              </h3>
              
              <div className="space-y-4">
                {topPackagesWithShare.map((pkg, idx) => (
                  <div key={pkg.package_slug} className="space-y-1.5">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                          {idx + 1}
                        </span>
                        <span className="text-slate-800 font-bold truncate max-w-[160px]">{pkg.package_name || pkg.package_slug}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#114C2A] font-extrabold">{formatCurrency(pkg.revenue)}</span>
                        <span className="text-xs text-slate-400 ml-1.5">({pkg.quantity} porsi)</span>
                      </div>
                    </div>
                    {/* Share Progress Bar */}
                    <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-gray-50/50">
                      <div 
                        className="h-full bg-gradient-to-r from-[#114C2A] to-[#F9A826] rounded-full transition-all duration-500"
                        style={{ width: `${pkg.share}%` }}
                      />
                    </div>
                  </div>
                ))}

                {topPackagesWithShare.length === 0 && (
                  <div className="py-8 text-center text-slate-400">
                    <p className="text-sm font-semibold">Tidak ada produk terjual.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right side: Daily Table Breakdown (3/5 size) */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm lg:col-span-3 flex flex-col">
              <h3 className="font-extrabold text-lg text-slate-800 flex items-center gap-1.5 mb-4">
                <CheckCircle2 className="w-5 h-5 text-[#114C2A]" />
                Rincian Harian Laporan
              </h3>

              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                      <th className="p-3">Tanggal</th>
                      <th className="p-3 text-center">Jumlah Transaksi</th>
                      <th className="p-3 text-right">Pendapatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sortedDailySales.map((day) => (
                      <tr key={day.date} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-semibold text-slate-700 text-sm">
                          {formatDate(day.date)}
                        </td>
                        <td className="p-3 text-center text-sm font-bold text-slate-600">
                          {day.count}
                        </td>
                        <td className="p-3 text-right text-sm font-extrabold text-[#114C2A]">
                          {formatCurrency(day.revenue)}
                        </td>
                      </tr>
                    ))}

                    {sortedDailySales.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-slate-400">
                          <p className="text-sm font-semibold">Tidak ada rincian harian.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </>
      ) : (
        <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center text-slate-400">
          <p className="font-bold">Gagal memproses data laporan.</p>
        </div>
      )}
    </div>
  );
}
