"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Trash2, X, Save, CalendarDays, DollarSign, Loader2, Leaf, Salad, Dumbbell, AlertCircle } from 'lucide-react';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ''}/api`;

const ICON_OPTIONS = [
  { value: 'Leaf', label: 'Leaf', icon: <Leaf className="w-6 h-6" /> },
  { value: 'Salad', label: 'Salad', icon: <Salad className="w-6 h-6" /> },
  { value: 'Dumbbell', label: 'Dumbbell', icon: <Dumbbell className="w-6 h-6" /> },
];

const DURATIONS = ["5 Hari", "6 Hari", "10 Hari", "30 Hari"];
const MEAL_TYPES = ["Lunch", "Dinner", "Lunch & Dinner"];



interface PackageData {
  _id?: string;
  slug?: string;
  category: string;
  icon: string;
  description: string;
  subscribers?: number;
  pricing: Record<string, Record<string, { normal: string; promo: string }>>;
}

const emptyPricing = (): PackageData['pricing'] => {
  const pricing: PackageData['pricing'] = {};
  DURATIONS.forEach(dur => {
    pricing[dur] = {};
    MEAL_TYPES.forEach(meal => {
      pricing[dur][meal] = { normal: '', promo: '' };
    });
  });
  return pricing;
};

const emptyForm = (): PackageData => ({
  category: '',
  icon: 'Leaf',
  description: '',
  subscribers: 0,
  pricing: emptyPricing(),
});

export default function PackagesPage() {
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'pricing'>('info');
  const [formData, setFormData] = useState<PackageData>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);



  // Fetch packages and menus from API
  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/packages/`);
      if (res.ok) setPackages(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  // Auto-hide success message
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);



  // Open form for creating
  const handleOpenCreate = () => {
    setFormData(emptyForm());
    setEditingId(null);
    setActiveTab('info');
    setError(null);
    setIsFormOpen(true);
  };

  // Open form for editing
  const handleOpenEdit = (pkg: PackageData) => {
    // Ensure pricing structure is complete (fill missing durations/meals)
    const fullPricing = emptyPricing();
    if (pkg.pricing) {
      Object.keys(pkg.pricing).forEach(dur => {
        if (fullPricing[dur]) {
          Object.keys(pkg.pricing[dur]).forEach(meal => {
            if (fullPricing[dur][meal]) {
              fullPricing[dur][meal] = pkg.pricing[dur][meal];
            }
          });
        }
      });
    }
    setFormData({ ...pkg, pricing: fullPricing });
    setEditingId(pkg._id || null);
    setActiveTab('info');
    setError(null);
    setIsFormOpen(true);
  };

  // Close form
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setError(null);
  };

  // Update pricing value
  const updatePricing = (duration: string, mealType: string, field: 'normal' | 'promo', value: string) => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        [duration]: {
          ...prev.pricing[duration],
          [mealType]: {
            ...prev.pricing[duration]?.[mealType],
            [field]: value,
          }
        }
      }
    }));
  };

  // Save (create or update)
  const handleSave = async () => {
    // Validation
    if (!formData.category.trim()) {
      setError('Nama paket wajib diisi');
      setActiveTab('info');
      return;
    }
    if (!formData.description.trim()) {
      setError('Deskripsi wajib diisi');
      setActiveTab('info');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        category: formData.category,
        slug: formData.category.toLowerCase().replace(/\s+/g, '-'),
        icon: formData.icon,
        description: formData.description,
        subscribers: formData.subscribers || 0,
        pricing: formData.pricing,
      };

      let res: Response;
      if (editingId) {
        res = await fetch(`${API_URL}/packages/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_URL}/packages/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menyimpan paket');
      }

      setSuccessMsg(editingId ? 'Paket berhasil diperbarui!' : 'Paket baru berhasil ditambahkan!');
      handleCloseForm();
      fetchPackages();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete package
  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus paket ini?')) return;
    try {
      const res = await fetch(`${API_URL}/packages/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus paket');
      setSuccessMsg('Paket berhasil dihapus!');
      fetchPackages();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Get icon component by name
  const getIcon = (iconName: string) => {
    const found = ICON_OPTIONS.find(i => i.value === iconName);
    return found ? found.icon : <Leaf className="w-6 h-6" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#114C2A] tracking-tight">Paket Langganan</h1>
          <p className="text-slate-500 mt-1">Kelola jenis paket dan harga per durasi.</p>
        </div>
        
        <button 
          onClick={handleOpenCreate}
          className="bg-[#114C2A] text-white px-5 py-2.5 rounded-xl font-bold border-2 border-transparent hover:bg-transparent hover:text-[#114C2A] hover:border-[#114C2A] transition-all flex items-center gap-2 shadow-md hover:shadow-none"
        >
          <Plus className="w-5 h-5" /> Tambah Paket
        </button>
      </div>

      {/* Success Message */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-sm font-bold animate-in fade-in duration-300">
          {successMsg}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#114C2A] animate-spin" />
          <span className="ml-3 text-slate-500 font-medium">Memuat data paket...</span>
        </div>
      )}

      {/* Package Cards */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {packages.map(pkg => (
            <div key={pkg._id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#f2f6f4] text-[#114C2A] flex items-center justify-center">
                    {getIcon(pkg.icon)}
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-800">{pkg.category}</h3>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenEdit(pkg)} className="text-slate-400 hover:text-[#F9A826] p-1"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(pkg._id!)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-6 min-h-[40px]">{pkg.description}</p>
              
              <div className="flex items-center gap-4 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <UsersIcon className="w-4 h-4" />
                  </div>
                  {pkg.subscribers || 0} Aktif
                </div>
                <div className="flex gap-2 ml-auto">
                  <button onClick={() => handleOpenEdit(pkg)} className="px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg flex items-center gap-1 hover:bg-emerald-100">
                    <DollarSign className="w-3 h-3" /> Harga
                  </button>
                  <Link href="/admin/menu-schedules" className="px-3 py-1.5 text-xs font-bold text-amber-600 bg-amber-50 rounded-lg flex items-center gap-1 hover:bg-amber-100">
                    <CalendarDays className="w-3 h-3" /> Jadwal
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {packages.length === 0 && !loading && (
            <div className="col-span-3 text-center py-16 text-slate-400">
              <p className="font-bold text-lg">Belum ada paket</p>
              <p className="text-sm mt-1">Klik &quot;Tambah Paket&quot; untuk membuat paket baru.</p>
            </div>
          )}
        </div>
      )}

      {/* Flyout Form Overlay */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-gray-100 bg-slate-50 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="font-extrabold text-xl text-slate-800">
                  {editingId ? 'Edit Paket Langganan' : 'Tambah Paket Baru'}
                </h2>
                <button onClick={handleCloseForm} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Internal Tabs */}
              <div className="flex gap-2 bg-gray-100/50 p-1 rounded-xl w-fit">
                {(['info', 'pricing'] as const).map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors
                      ${activeTab === tab ? 'bg-white text-[#114C2A] shadow-sm' : 'text-slate-500 hover:text-slate-700'}
                    `}
                  >
                    {tab === 'info' ? 'Info Dasar' : 'Harga'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium mb-6 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {activeTab === 'info' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nama Paket <span className="text-red-400">*</span></label>
                    <input 
                      type="text" 
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#F9A826] font-medium" 
                      placeholder="Contoh: Super Weight Loss" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Deskripsi <span className="text-red-400">*</span></label>
                    <textarea 
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#F9A826] min-h-[100px] font-medium" 
                      placeholder="Deskripsi paket untuk pelanggan..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Ikon</label>
                    <div className="flex gap-3">
                      {ICON_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, icon: opt.value }))}
                          className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all
                            ${formData.icon === opt.value 
                              ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-500 shadow-sm' 
                              : 'bg-slate-50 text-slate-400 border-2 border-transparent hover:border-slate-200'}
                          `}
                        >
                          {opt.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'pricing' && (
                <div className="space-y-6">
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm font-medium">
                    Atur kombinasi harga berdasarkan durasi hari dan waktu makan.
                  </div>
                  
                  {DURATIONS.map(duration => (
                    <div key={duration} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 p-3 border-b border-gray-200 font-bold text-sm">
                        Durasi {duration}
                      </div>
                      <div className="p-4 space-y-4">
                        {MEAL_TYPES.map((meal, idx) => (
                          <div key={meal} className={`grid grid-cols-3 gap-4 ${idx < MEAL_TYPES.length - 1 ? 'border-b border-gray-50 pb-4' : ''}`}>
                            <div className="text-sm font-bold text-slate-600 flex items-center">{meal}</div>
                            <div>
                              <label className="text-xs text-slate-400">Normal</label>
                              <input 
                                type="text" 
                                value={formData.pricing[duration]?.[meal]?.normal || ''}
                                onChange={(e) => updatePricing(duration, meal, 'normal', e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F9A826]" 
                                placeholder="180.000"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-[#114C2A] font-semibold">Promo</label>
                              <input 
                                type="text" 
                                value={formData.pricing[duration]?.[meal]?.promo || ''}
                                onChange={(e) => updatePricing(duration, meal, 'promo', e.target.value)}
                                className="w-full border border-[#114C2A]/30 rounded-lg px-3 py-1.5 text-sm font-bold text-[#114C2A] focus:outline-none focus:ring-2 focus:ring-[#F9A826]" 
                                placeholder="150.000"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}


            </div>

            <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
              <button onClick={handleCloseForm} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Batal</button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-[#114C2A] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#1a663a] transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                ) : (
                  <><Save className="w-4 h-4" /> Simpan Paket</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Dummy icon component
function UsersIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
