"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Save, X, AlertTriangle, Loader2, AlertCircle } from 'lucide-react';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ''}/api`;

interface Material {
  _id?: string;
  name: string;
  unit: string;
  stock: number;
  min_stock: number;
}

const emptyForm = (): Material => ({
  name: '',
  unit: 'gram',
  stock: 0,
  min_stock: 0,
});

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<Material>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch materials from API
  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/materials/`);
      if (!res.ok) throw new Error('Gagal memuat data bahan baku');
      const data = await res.json();
      setMaterials(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

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
    setError(null);
    setIsFormOpen(true);
  };

  // Open form for editing
  const handleOpenEdit = (material: Material) => {
    setFormData({
      name: material.name,
      unit: material.unit,
      stock: material.stock,
      min_stock: material.min_stock,
    });
    setEditingId(material._id || null);
    setError(null);
    setIsFormOpen(true);
  };

  // Close form
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setError(null);
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Nama bahan baku wajib diisi');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: formData.name,
        unit: formData.unit,
        stock: Number(formData.stock),
        min_stock: Number(formData.min_stock),
      };

      let res: Response;
      if (editingId) {
        res = await fetch(`${API_URL}/materials/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_URL}/materials/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menyimpan bahan baku');
      }

      setSuccessMsg(editingId ? 'Bahan baku berhasil diperbarui!' : 'Bahan baku baru berhasil ditambahkan!');
      handleCloseForm();
      fetchMaterials();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete material
  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus bahan baku ini?')) return;
    try {
      const res = await fetch(`${API_URL}/materials/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus bahan baku');
      setSuccessMsg('Bahan baku berhasil dihapus!');
      fetchMaterials();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredMaterials = materials.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#114C2A] tracking-tight">Stok Bahan Baku</h1>
          <p className="text-slate-500 mt-1">Kelola inventaris dapur untuk integrasi akurasi perhitungan Gramasi &amp; Random Forest.</p>
        </div>
        
        <button 
          onClick={handleOpenCreate}
          className="bg-[#114C2A] text-white px-5 py-2.5 rounded-xl font-bold border-2 border-transparent hover:bg-transparent hover:text-[#114C2A] hover:border-[#114C2A] transition-all flex items-center gap-2 shadow-md hover:shadow-none"
        >
          <Plus className="w-5 h-5" /> Tambah Bahan
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
          <span className="ml-3 text-slate-500 font-medium">Memuat data bahan baku...</span>
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-100 flex items-center gap-4">
              <div className="bg-white text-red-500 p-2 rounded-xl shadow-sm"><AlertTriangle className="w-5 h-5" /></div>
              <div>
                <p className="text-sm font-bold">Stok Menipis / Kritis</p>
                <p className="text-2xl font-black">{materials.filter(m => m.stock < m.min_stock).length} Item</p>
              </div>
            </div>
            <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100 flex items-center gap-4">
              <div className="bg-white text-emerald-500 p-2 rounded-xl shadow-sm"><Save className="w-5 h-5" /></div>
              <div>
                <p className="text-sm font-bold">Total Jenis Bahan</p>
                <p className="text-2xl font-black">{materials.length} Item</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-4 bg-slate-50/50">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari bahan baku..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A826] font-medium"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-gray-100">
                    <th className="p-4 font-bold">Nama Bahan Baku</th>
                    <th className="p-4 font-bold">Satuan</th>
                    <th className="p-4 font-bold">Stok Saat Ini</th>
                    <th className="p-4 font-bold">Batas Minimum</th>
                    <th className="p-4 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredMaterials.map((item) => {
                      const isLowStock = item.stock < item.min_stock;
                      return (
                        <tr key={item._id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="p-4">
                            <p className="font-bold text-slate-800 flex items-center gap-2">
                                {item.name}
                                {isLowStock && <span className="bg-red-500 w-2 h-2 rounded-full animate-pulse blur-[1px]"></span>}
                            </p>
                          </td>
                          <td className="p-4"><span className="text-slate-500 font-medium text-sm">{item.unit}</span></td>
                          <td className="p-4">
                              <span className={`font-black ${isLowStock ? 'text-red-500' : 'text-[#114C2A]'}`}>
                                  {item.stock.toLocaleString()}
                              </span>
                          </td>
                          <td className="p-4 text-slate-400 font-semibold">{item.min_stock.toLocaleString()}</td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleOpenEdit(item)}
                                className="p-2 text-slate-400 hover:text-[#F9A826] bg-white hover:bg-amber-50 rounded-lg shadow-sm border border-gray-100 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(item._id!)}
                                className="p-2 text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 rounded-lg shadow-sm border border-gray-100 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                  })}
                  {filteredMaterials.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">Tidak ada bahan baku yang sesuai pencarian.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

       {/* Flyout Form Overlay */}
       {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-extrabold text-xl text-slate-800">
                {editingId ? 'Edit Bahan Baku' : 'Bahan Baku Baru'}
              </h2>
              <button onClick={handleCloseForm} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
               {/* Error Message */}
               {error && (
                 <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium flex items-center gap-2">
                   <AlertCircle className="w-4 h-4 shrink-0" />
                   {error}
                 </div>
               )}

               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2">Nama Bahan Baku <span className="text-red-400">*</span></label>
                 <input 
                   type="text" 
                   value={formData.name}
                   onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                   className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#F9A826] font-medium" 
                   placeholder="Contoh: Bawang Putih" 
                 />
               </div>

               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2">Satuan Pengukuran</label>
                 <select 
                   value={formData.unit}
                   onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                   className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#F9A826] font-medium text-slate-700"
                 >
                     <option value="gram">Gram (g)</option>
                     <option value="ml">Mililiter (ml)</option>
                     <option value="butir">Butir / Pcs</option>
                     <option value="lembar">Lembar</option>
                 </select>
               </div>

               <div className="grid grid-cols-2 gap-4">
                   <div>
                       <label className="block text-sm font-bold text-slate-700 mb-2">Stok {editingId ? 'Saat Ini' : 'Awal'}</label>
                       <input 
                         type="number" 
                         value={formData.stock}
                         onChange={(e) => setFormData(prev => ({ ...prev, stock: Number(e.target.value) }))}
                         className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#F9A826] font-medium" 
                         placeholder="0" 
                       />
                   </div>
                   <div>
                       <label className="block text-sm font-bold text-slate-700 mb-2">Batas Minimum (Peringatan)</label>
                       <input 
                         type="number" 
                         value={formData.min_stock}
                         onChange={(e) => setFormData(prev => ({ ...prev, min_stock: Number(e.target.value) }))}
                         className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#F9A826] font-medium" 
                         placeholder="1000" 
                       />
                   </div>
               </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3">
                <button onClick={handleCloseForm} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Batal</button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#114C2A] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#1a663a] transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                    ) : (
                      <><Save className="w-4 h-4" /> Simpan Data</>
                    )}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
