"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Plus, Search, Edit2, Trash2, X, Save, Loader2, AlertCircle, Upload, ImageIcon, Scale, Flame } from 'lucide-react';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || ''}/api`;

interface ItemDetail {
  name: string;
  quantity: string;
  unit: string;
}

interface Menu {
  _id?: string;
  title: string;
  category: string;
  items: string[];          // data dari API tetap string[]
  item_details?: ItemDetail[]; // detail bahan dengan jumlah (hanya frontend)
  image_url?: string;
  image_public_id?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sugar?: number;
  price?: number;
  is_orderable?: boolean;
  is_available?: boolean;
}

interface MenuCategory {
  _id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

const UNIT_OPTIONS = [
  'gram', 'kg', 'ml', 'liter', 'sdm', 'sdt', 'buah', 'lembar', 'siung', 'batang', 'butir', 'potong', 'sachet', 'bungkus', 'botol',
];

const emptyForm = (): Menu => ({
  title: '',
  category: 'lunch',
  items: [],
  item_details: [],
  image_url: '',
  image_public_id: '',
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  sugar: 0,
  price: 0,
  is_orderable: false,
  is_available: true,
});

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formData, setFormData] = useState<Menu>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState("");
  const [newItemQty, setNewItemQty] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("gram");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const getCategoryLabel = (slug: string) => categories.find(cat => cat.slug === slug)?.name || slug;

  // Debounce search query agar tidak fetch setiap ketikan huruf
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch menus from API
  const fetchMenus = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      
      const res = await fetch(`${API_URL}/menus/?${params.toString()}`);
      if (!res.ok) throw new Error('Gagal memuat data menu');
      const data = await res.json();
      // Normalize: pastikan items selalu string[] dan item_details selalu ada
      const normalized = data.map((m: any) => {
        const itemDetails: ItemDetail[] = m.item_details && m.item_details.length > 0
          ? m.item_details
          : (m.items || []).map((item: any) => ({
              name: typeof item === 'string' ? item : item.name || '',
              quantity: '',
              unit: 'gram',
            }));
        const items: string[] = itemDetails.map((d: ItemDetail) => d.name);
        return { ...m, items, item_details: itemDetails };
      });
      setMenus(normalized);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryFilter]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/menu-categories/?active_only=true`);
      if (!res.ok) throw new Error('Gagal memuat kategori menu');
      const data: MenuCategory[] = await res.json();
      setCategories(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchMenus();
  }, [fetchCategories, fetchMenus]);

  // Auto-hide success message
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // --- Image Upload Handler ---
  const handleImageUpload = async (file: File) => {
    // Validasi tipe file
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError('Format file tidak didukung. Gunakan: PNG, JPG, WEBP, atau GIF.');
      return;
    }

    // Validasi ukuran (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file terlalu besar. Maksimal 5MB.');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('folder', 'nutrilicious/menus');

      const res = await fetch(`${API_URL}/upload/`, {
        method: 'POST',
        body: formDataUpload,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal upload gambar');
      }

      const result = await res.json();
      setFormData(prev => ({
        ...prev,
        image_url: result.url,
        image_public_id: result.public_id,
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      image_url: '',
      image_public_id: '',
    }));
  };

  // Open form for creating
  const handleOpenCreate = () => {
    setFormData({ ...emptyForm(), category: categories[0]?.slug || 'lunch' });
    setEditingId(null);
    setNewItem("");
    setNewItemQty("");
    setNewItemUnit("gram");
    setError(null);
    setIsFormOpen(true);
  };

  // Open form for editing
  const handleOpenEdit = (menu: Menu) => {
    // Backward-compatible: kalau belum ada item_details, buat dari items string
    const details: ItemDetail[] = menu.item_details && menu.item_details.length > 0
      ? [...menu.item_details]
      : menu.items.map(name => ({ name, quantity: '', unit: 'gram' }));
    
    setFormData({
      title: menu.title,
      category: menu.category,
      items: [...menu.items],
      item_details: details,
      image_url: menu.image_url || '',
      image_public_id: menu.image_public_id || '',
      calories: menu.calories || 0,
      protein: menu.protein || 0,
      carbs: menu.carbs || 0,
      fat: menu.fat || 0,
      sugar: menu.sugar || 0,
      price: menu.price || 0,
      is_orderable: menu.is_orderable || false,
      is_available: menu.is_available !== false,
    });
    setEditingId(menu._id || null);
    setNewItem("");
    setNewItemQty("");
    setNewItemUnit("gram");
    setError(null);
    setIsFormOpen(true);
  };

  // Close form
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setError(null);
  };

  // Add item to composition list
  const handleAddItem = () => {
    if (!newItem.trim()) return;
    const detail: ItemDetail = {
      name: newItem.trim(),
      quantity: newItemQty.trim(),
      unit: newItemUnit,
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem.trim()],
      item_details: [...(prev.item_details || []), detail],
    }));
    setNewItem("");
    setNewItemQty("");
    setNewItemUnit("gram");
  };

  // Remove item from composition list
  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
      item_details: (prev.item_details || []).filter((_, i) => i !== index),
    }));
  };

  // Update item detail (quantity or unit) inline
  const handleUpdateItemDetail = (index: number, field: keyof ItemDetail, value: string) => {
    setFormData(prev => {
      const newDetails = [...(prev.item_details || [])];
      if (newDetails[index]) {
        newDetails[index] = { ...newDetails[index], [field]: value };
      }
      return { ...prev, item_details: newDetails };
    });
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!formData.title.trim()) {
      setError('Judul menu wajib diisi');
      return;
    }
    if (formData.items.length === 0) {
      setError('Minimal harus ada 1 bahan/komposisi');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Kirim items + item_details ke API
      const details = formData.item_details || [];
      const payload = {
        title: formData.title,
        category: formData.category,
        items: details.map(d => d.name),
        item_details: details.map(d => ({
          name: d.name,
          quantity: d.quantity,
          unit: d.unit,
        })),
        image_url: formData.image_url,
        image_public_id: formData.image_public_id,
        calories: Number(formData.calories) || 0,
        protein: Number(formData.protein) || 0,
        carbs: Number(formData.carbs) || 0,
        fat: Number(formData.fat) || 0,
        sugar: Number(formData.sugar) || 0,
        price: Number(formData.price) || 0,
        is_orderable: Boolean(formData.is_orderable),
        is_available: Boolean(formData.is_available),
      };

      let res: Response;
      if (editingId) {
        res = await fetch(`${API_URL}/menus/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_URL}/menus/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menyimpan menu');
      }

      setSuccessMsg(editingId ? 'Menu berhasil diperbarui!' : 'Menu baru berhasil ditambahkan!');
      handleCloseForm();
      fetchMenus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete menu
  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus menu ini?')) return;
    try {
      const res = await fetch(`${API_URL}/menus/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus menu');
      setSuccessMsg('Menu berhasil dihapus!');
      fetchMenus();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Client-side filtering (search is also done via API, but we keep local filter for instant UX)
  const filteredMenus = menus;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#114C2A] tracking-tight">Katalog Menu</h1>
          <p className="text-slate-500 mt-1">Kelola daftar makanan dan komposisinya.</p>
        </div>
        
        <button 
          onClick={handleOpenCreate}
          className="bg-[#114C2A] text-white px-5 py-2.5 rounded-xl font-bold border-2 border-transparent hover:bg-transparent hover:text-[#114C2A] hover:border-[#114C2A] transition-all flex items-center gap-2 shadow-md hover:shadow-none"
        >
          <Plus className="w-5 h-5" /> Tambah Menu Baru
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
          <span className="ml-3 text-slate-500 font-medium">Memuat data menu...</span>
        </div>
      )}

      {/* Main Content Area */}
      {!loading && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-100 flex items-center gap-4 bg-slate-50/50">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari nama menu..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A826] focus:border-transparent font-medium text-slate-700"
              />
            </div>
            <div className="flex gap-2">
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#F9A826]"
              >
                <option value="all">Semua Kategori</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="p-4 font-bold w-16">Foto</th>
                  <th className="p-4 font-bold">Nama Menu</th>
                  <th className="p-4 font-bold">Kategori</th>
                    <th className="p-4 font-bold">Bahan / Komposisi</th>
                    <th className="p-4 font-bold">Harga Perporsi</th>
                  <th className="p-4 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredMenus.map((menu) => (
                  <tr key={menu._id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-4">
                      {menu.image_url ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 relative">
                          <Image
                            src={menu.image_url}
                            alt={menu.title}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-slate-300" />
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{menu.title}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px] font-semibold">
                        <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md">
                          {menu.calories || 0} kcal
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md">
                          P: {menu.protein || 0}g
                        </span>
                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md">
                          K: {menu.carbs || 0}g
                        </span>
                        <span className="bg-pink-50 text-pink-700 px-1.5 py-0.5 rounded-md">
                          L: {menu.fat || 0}g
                        </span>
                        <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-md">
                          G: {menu.sugar || 0}g
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold capitalize
                        ${menu.category === 'lunch' ? 'bg-blue-50 text-blue-600' : 
                          menu.category === 'dinner' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}
                      `}>
                        {getCategoryLabel(menu.category)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                          {(menu.item_details || []).map((detail, idx) => {
                              const label = detail.quantity
                                ? `${detail.name} (${detail.quantity} ${detail.unit})`
                                : detail.name;
                              return (
                                <span key={idx} className="bg-gray-100 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                                    {label}
                                </span>
                              );
                          })}
                      </div>
                    </td>
                    <td className="p-4">
                      {menu.is_orderable ? (
                        <div>
                          <p className="font-bold text-[#114C2A] text-sm">Rp{Number(menu.price || 0).toLocaleString('id-ID')}</p>
                          <p className={`text-[10px] font-bold ${menu.is_available === false ? 'text-red-500' : 'text-emerald-600'}`}>
                            {menu.is_available === false ? 'Tidak tersedia' : 'Bisa dipesan'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">Tidak dijual perporsi</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenEdit(menu)}
                          className="p-2 text-slate-400 hover:text-[#F9A826] bg-white hover:bg-amber-50 rounded-lg shadow-sm border border-gray-100 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(menu._id!)}
                          className="p-2 text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 rounded-lg shadow-sm border border-gray-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredMenus.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">Tidak ada menu yang sesuai pencarian.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Flyout Form Overlay */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-extrabold text-xl text-slate-800">
                {editingId ? 'Edit Menu' : 'Tambah Menu Baru'}
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

               {/* ===== IMAGE UPLOAD SECTION ===== */}
               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2">Foto Menu</label>
                 
                 {formData.image_url ? (
                   /* Preview gambar yang sudah di-upload */
                   <div className="relative group/img">
                     <div className="relative w-full h-48 rounded-2xl overflow-hidden border-2 border-emerald-200 bg-slate-50">
                       <Image
                         src={formData.image_url}
                         alt="Preview menu"
                         fill
                         className="object-cover"
                         sizes="(max-width: 512px) 100vw, 512px"
                       />
                     </div>
                     <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-3">
                       <label className="bg-white text-slate-700 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-100 transition-colors flex items-center gap-2 shadow-lg">
                         <Upload className="w-4 h-4" /> Ganti
                         <input
                           type="file"
                           accept="image/png,image/jpeg,image/webp,image/gif"
                           onChange={handleFileChange}
                           className="sr-only"
                         />
                       </label>
                       <button
                         type="button"
                         onClick={handleRemoveImage}
                         className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-600 transition-colors flex items-center gap-2 shadow-lg"
                       >
                         <Trash2 className="w-4 h-4" /> Hapus
                       </button>
                     </div>
                     <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow">
                       ✓ Uploaded
                     </div>
                   </div>
                 ) : (
                   /* Drop zone / upload area */
                   <label
                     className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all
                       ${dragOver 
                         ? 'border-[#114C2A] bg-[#114C2A]/5 scale-[1.02]' 
                         : 'border-gray-300 bg-slate-50 hover:bg-slate-100 hover:border-gray-400'
                       }
                       ${uploading ? 'pointer-events-none opacity-60' : ''}
                     `}
                     onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                     onDragLeave={() => setDragOver(false)}
                     onDrop={handleDrop}
                   >
                     {uploading ? (
                       <div className="flex flex-col items-center gap-3">
                         <Loader2 className="w-8 h-8 text-[#114C2A] animate-spin" />
                         <span className="text-sm font-bold text-slate-500">Mengupload ke Cloudinary...</span>
                       </div>
                     ) : (
                       <div className="flex flex-col items-center gap-3">
                         <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center">
                           <Upload className="w-6 h-6 text-slate-400" />
                         </div>
                         <div className="text-center">
                           <p className="text-sm font-bold text-slate-600">
                             {dragOver ? 'Lepas file di sini' : 'Klik atau drag & drop gambar'}
                           </p>
                           <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP, GIF — Maks 5MB</p>
                         </div>
                       </div>
                     )}
                     <input
                       type="file"
                       accept="image/png,image/jpeg,image/webp,image/gif"
                       onChange={handleFileChange}
                       className="sr-only"
                       disabled={uploading}
                     />
                   </label>
                 )}
               </div>

               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2">Judul Menu <span className="text-red-400">*</span></label>
                 <input 
                   type="text" 
                   value={formData.title}
                   onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                   className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#F9A826] font-medium" 
                   placeholder="Contoh: Nasi Merah Ayam Bakar" 
                 />
               </div>

               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Kategori <span className="text-red-400">*</span></label>
                   <div className="grid grid-cols-2 gap-3">
                       {categories.map(cat => (
                          <label
                            key={cat._id}
                            className={`flex items-center justify-center p-3 border rounded-xl cursor-pointer transition-all
                              ${formData.category === cat.slug
                                ? 'border-[#114C2A] bg-[#114C2A]/5 text-[#114C2A] ring-2 ring-[#114C2A]/20'
                                : 'border-gray-200 hover:bg-gray-50'
                              }
                            `}
                          >
                              <input
                                type="radio"
                                name="category"
                                value={cat.slug}
                                checked={formData.category === cat.slug}
                                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                className="sr-only"
                              />
                              <span className="font-bold text-sm">{cat.name}</span>
                          </label>
                      ))}
                  </div>
                </div>

                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <label className="block text-sm font-bold text-slate-700">Dijual Perporsi</label>
                      <p className="text-xs text-slate-400">Aktifkan untuk pesanan coba menu atau acara.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(formData.is_orderable)}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_orderable: e.target.checked }))}
                      className="w-5 h-5 accent-[#114C2A]"
                    />
                  </div>
                  {formData.is_orderable && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Harga per porsi</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.price || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) || 0 }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A826] font-medium bg-white"
                          placeholder="35000"
                        />
                      </div>
                      <label className="flex items-center gap-2 pt-6 text-sm font-bold text-slate-600">
                        <input
                          type="checkbox"
                          checked={formData.is_available !== false}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_available: e.target.checked }))}
                          className="w-4 h-4 accent-[#114C2A]"
                        />
                        Tersedia
                      </label>
                    </div>
                  )}
                </div>

                {/* Kandungan Gizi */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-500" /> Kandungan Gizi
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Kalori (kcal)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={formData.calories || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, calories: Number(e.target.value) || 0 }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A826] font-medium bg-white" 
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Protein (g)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={formData.protein || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, protein: Number(e.target.value) || 0 }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A826] font-medium bg-white" 
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Karbohidrat (g)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={formData.carbs || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, carbs: Number(e.target.value) || 0 }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A826] font-medium bg-white" 
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Lemak (g)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={formData.fat || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, fat: Number(e.target.value) || 0 }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A826] font-medium bg-white" 
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Gula (g)</label>
                      <input 
                        type="number" 
                        min="0"
                        value={formData.sugar || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, sugar: Number(e.target.value) || 0 }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F9A826] font-medium bg-white" 
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-[#114C2A]" />
                      Komposisi / Bahan <span className="text-red-400">*</span>
                    </span>
                  </label>
                  <p className="text-xs text-slate-400 mb-3">Tambahkan bahan beserta jumlah yang dibutuhkan untuk membuat menu ini.</p>
                  
                  {/* Input Row */}
                  <div className="flex items-end gap-2 mb-3">
                    <div className="flex-1">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Nama Bahan</span>
                      <input 
                        type="text" 
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddItem();
                          }
                        }}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#F9A826] text-sm font-medium bg-white" 
                        placeholder="contoh: Ayam Fillet" 
                      />
                    </div>
                    <div className="w-20">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Jumlah</span>
                      <input 
                        type="number" 
                        min="0"
                        step="any"
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddItem();
                          }
                        }}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#F9A826] text-sm font-medium bg-white" 
                        placeholder="100" 
                      />
                    </div>
                    <div className="w-24">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Satuan</span>
                      <select
                        value={newItemUnit}
                        onChange={(e) => setNewItemUnit(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-2 mt-1 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#F9A826]"
                      >
                        {UNIT_OPTIONS.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      type="button"
                      onClick={handleAddItem}
                      className="bg-[#114C2A] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#1a663a] transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah
                    </button>
                  </div>

                  {/* Tabel Daftar Bahan */}
                  {(formData.item_details || []).length === 0 ? (
                    <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-sm text-slate-400">
                      Belum ada bahan ditambahkan.
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-gray-200">
                            <th className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-10 text-center">No</th>
                            <th className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nama Bahan</th>
                            <th className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-20 text-center">Jumlah</th>
                            <th className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24">Satuan</th>
                            <th className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-10 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(formData.item_details || []).map((detail, idx) => (
                            <tr key={idx} className="hover:bg-emerald-50/50 transition-colors group/row">
                              <td className="px-3 py-2 text-center">
                                <span className="w-5 h-5 rounded-full bg-[#114C2A]/10 text-[#114C2A] text-[11px] font-bold inline-flex items-center justify-center">
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-sm font-semibold text-slate-700">
                                {detail.name}
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                <input 
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={detail.quantity}
                                  onChange={(e) => handleUpdateItemDetail(idx, 'quantity', e.target.value)}
                                  className="w-full border border-gray-200 rounded-md px-2 py-1 text-xs font-medium text-center bg-white focus:outline-none focus:ring-2 focus:ring-[#F9A826] hover:border-[#F9A826] transition-colors"
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-3 py-1.5">
                                <select
                                  value={detail.unit}
                                  onChange={(e) => handleUpdateItemDetail(idx, 'unit', e.target.value)}
                                  className="w-full border border-gray-200 rounded-md px-1.5 py-1 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#F9A826] hover:border-[#F9A826] transition-colors"
                                >
                                  {UNIT_OPTIONS.map(u => (
                                    <option key={u} value={u}>{u}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button 
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                  title="Hapus bahan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="bg-slate-50 border-t border-gray-200 px-3 py-1.5 text-[11px] text-slate-400 font-medium text-right">
                        Total: {(formData.item_details || []).length} bahan
                      </div>
                    </div>
                  )}
                </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3">
                <button onClick={handleCloseForm} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Batal</button>
                <button 
                  onClick={handleSave}
                  disabled={saving || uploading}
                  className="bg-[#114C2A] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#1a663a] transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                    ) : (
                      <><Save className="w-4 h-4" /> Simpan Menu</>
                    )}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
