"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, Save, X, Loader2, AlertCircle, Tags } from 'lucide-react';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ''}/api`;

interface MenuCategory {
  _id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

export default function MenuCategoriesPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<MenuCategory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/menu-categories/`);
      if (!res.ok) throw new Error('Gagal memuat kategori menu');
      setCategories(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => setSuccessMsg(null), 3000);
    return () => clearTimeout(timer);
  }, [successMsg]);

  const resetForm = () => {
    setName('');
    setEditing(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama kategori wajib diisi');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const res = await fetch(`${API_URL}/menu-categories/${editing ? editing._id : ''}`, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, is_active: editing?.is_active ?? true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan kategori');
      setSuccessMsg(editing ? 'Kategori berhasil diperbarui' : 'Kategori berhasil ditambahkan');
      resetForm();
      fetchCategories();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (category: MenuCategory) => {
    try {
      const res = await fetch(`${API_URL}/menu-categories/${category._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !category.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah status kategori');
      fetchCategories();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (category: MenuCategory) => {
    if (!confirm(`Yakin ingin menghapus kategori ${category.name}?`)) return;
    try {
      const res = await fetch(`${API_URL}/menu-categories/${category._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus kategori');
      setSuccessMsg('Kategori berhasil dihapus');
      fetchCategories();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-[#114C2A] tracking-tight">Kategori Menu</h1>
        <p className="text-slate-500 mt-1">Kelola master data kategori menu yang tampil di admin dan katalog user.</p>
      </div>

      {successMsg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-sm font-bold">{successMsg}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 h-fit space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#114C2A]/10 text-[#114C2A] rounded-xl flex items-center justify-center">
              <Tags className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-800">{editing ? 'Edit Kategori' : 'Tambah Kategori'}</h2>
              <p className="text-xs text-slate-400">Contoh: Breakfast, Snack, Lunch</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Nama Kategori</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#F9A826] font-medium"
              placeholder="Contoh: Breakfast"
            />
          </div>
          <div className="flex gap-2">
            <button disabled={saving} className="bg-[#114C2A] text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editing ? 'Simpan' : 'Tambah'}
            </button>
            {editing && <button type="button" onClick={resetForm} className="px-4 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 flex items-center gap-2"><X className="w-4 h-4" />Batal</button>}
          </div>
        </form>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 flex justify-center text-slate-400"><Loader2 className="w-7 h-7 animate-spin" /></div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="p-4 font-bold">Nama</th>
                  <th className="p-4 font-bold">Slug</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {categories.map(category => (
                  <tr key={category._id} className="hover:bg-slate-50/80">
                    <td className="p-4 font-bold text-slate-800">{category.name}</td>
                    <td className="p-4 text-sm font-semibold text-slate-500">{category.slug}</td>
                    <td className="p-4">
                      <button onClick={() => handleToggleActive(category)} className={`px-3 py-1 rounded-full text-xs font-bold ${category.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        {category.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setEditing(category); setName(category.name); }} className="p-2 text-slate-400 hover:text-[#F9A826] bg-white hover:bg-amber-50 rounded-lg border border-gray-100"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(category)} className="p-2 text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 rounded-lg border border-gray-100"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
