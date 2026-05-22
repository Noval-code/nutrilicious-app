"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Plus, Search, Edit2, Trash2, X, Save, Loader2, AlertCircle, Upload, ImageIcon } from 'lucide-react';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;

interface Menu {
  _id?: string;
  title: string;
  category: string;
  items: string[];
  image_url?: string;
  image_public_id?: string;
}

const emptyForm = (): Menu => ({
  title: '',
  category: 'lunch',
  items: [],
  image_url: '',
  image_public_id: '',
});

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formData, setFormData] = useState<Menu>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Fetch menus from API
  const fetchMenus = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      
      const res = await fetch(`${API_URL}/menus/?${params.toString()}`);
      if (!res.ok) throw new Error('Gagal memuat data menu');
      const data = await res.json();
      setMenus(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter]);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

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
    setFormData(emptyForm());
    setEditingId(null);
    setNewItem("");
    setError(null);
    setIsFormOpen(true);
  };

  // Open form for editing
  const handleOpenEdit = (menu: Menu) => {
    setFormData({
      title: menu.title,
      category: menu.category,
      items: [...menu.items],
      image_url: menu.image_url || '',
      image_public_id: menu.image_public_id || '',
    });
    setEditingId(menu._id || null);
    setNewItem("");
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
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem.trim()] }));
    setNewItem("");
  };

  // Remove item from composition list
  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
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

      const payload = {
        title: formData.title,
        category: formData.category,
        items: formData.items,
        image_url: formData.image_url,
        image_public_id: formData.image_public_id,
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
          <p className="text-slate-500 mt-1">Kelola daftar makanan, minuman, dan komposisinya.</p>
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
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="drinks">Drinks</option>
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
                  <th className="p-4 font-bold">Bahan / Komposisi (Highlights)</th>
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
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold capitalize
                        ${menu.category === 'lunch' ? 'bg-blue-50 text-blue-600' : 
                          menu.category === 'dinner' ? 'bg-indigo-50 text-indigo-600' : 
                          'bg-amber-50 text-amber-600'}
                      `}>
                        {menu.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                          {menu.items.map((item, idx) => (
                              <span key={idx} className="bg-gray-100 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                                  {item}
                              </span>
                          ))}
                      </div>
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
                    <td colSpan={5} className="p-8 text-center text-slate-500">Tidak ada menu yang sesuai pencarian.</td>
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
                 <div className="grid grid-cols-3 gap-3">
                     {['Lunch', 'Dinner', 'Drinks'].map(cat => (
                         <label 
                           key={cat} 
                           className={`flex items-center justify-center p-3 border rounded-xl cursor-pointer transition-all
                             ${formData.category === cat.toLowerCase() 
                               ? 'border-[#114C2A] bg-[#114C2A]/5 text-[#114C2A] ring-2 ring-[#114C2A]/20' 
                               : 'border-gray-200 hover:bg-gray-50'
                             }
                           `}
                         >
                             <input 
                               type="radio" 
                               name="category" 
                               value={cat.toLowerCase()} 
                               checked={formData.category === cat.toLowerCase()}
                               onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                               className="sr-only" 
                             />
                             <span className="font-bold text-sm">{cat}</span>
                         </label>
                     ))}
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-2">Komposisi / Bahan <span className="text-red-400">*</span></label>
                 <div className="space-y-3">
                     <div className="flex gap-2">
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
                           className="flex-1 border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#F9A826] text-sm font-medium" 
                           placeholder="Nama Bahan (contoh: Ayam Fillet)" 
                         />
                         <button 
                           type="button"
                           onClick={handleAddItem}
                           className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                         >
                           Tambah
                         </button>
                     </div>

                     {formData.items.length === 0 ? (
                       <div className="p-4 bg-slate-50 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-sm text-slate-400 border-dashed">
                           Belum ada bahan ditambahkan.
                       </div>
                     ) : (
                       <div className="flex flex-wrap gap-2">
                         {formData.items.map((item, idx) => (
                           <span 
                             key={idx} 
                             className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-sm font-semibold pl-3 pr-1.5 py-1.5 rounded-lg border border-emerald-100"
                           >
                             {item}
                             <button 
                               type="button"
                               onClick={() => handleRemoveItem(idx)}
                               className="p-0.5 hover:bg-emerald-200/60 rounded-md transition-colors"
                             >
                               <X className="w-3.5 h-3.5" />
                             </button>
                           </span>
                         ))}
                       </div>
                     )}
                 </div>
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
