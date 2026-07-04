"""
Script untuk menambahkan bahan baku yang belum ada di collection materials.
Mengambil dari item_details di semua menu, lalu menambahkan yang belum ada.

Jalankan: python add_missing_materials.py
"""
from dotenv import load_dotenv
load_dotenv()
from db import get_db


def add_missing_materials():
    db = get_db()

    # Ambil semua menu dan item_details
    menus = list(db['menus'].find({}, {'title': 1, 'item_details': 1}))
    materials = list(db['materials'].find({}, {'name': 1}))

    # Set nama materials yang sudah ada (lowercase)
    existing = {m['name'].strip().lower() for m in materials}

    # Kumpulkan bahan unik dari item_details yang BELUM ada di materials
    missing = {}  # key: name_lower, value: {name, unit}
    for menu in menus:
        for detail in menu.get('item_details', []):
            name = detail.get('name', '').strip()
            if not name:
                continue
            name_lower = name.lower()
            if name_lower not in existing and name_lower not in missing:
                unit = detail.get('unit', 'gram').strip() or 'gram'
                missing[name_lower] = {
                    'name': name,
                    'unit': unit,
                }

    if not missing:
        print("Semua bahan sudah ada di materials. Tidak ada yang perlu ditambahkan.")
        return

    # Buat documents untuk insert
    new_materials = []
    for name_lower, info in sorted(missing.items()):
        new_materials.append({
            'name': info['name'],
            'unit': info['unit'],
            'stock': 0,      # Default stok 0, admin perlu isi manual
            'min_stock': 0,   # Default min_stock 0
        })

    # Insert ke database
    result = db['materials'].insert_many(new_materials)

    print("=" * 60)
    print(f"  BERHASIL MENAMBAHKAN {len(result.inserted_ids)} BAHAN BAKU BARU")
    print("=" * 60)
    print()
    for mat in new_materials:
        print(f"  + {mat['name']} ({mat['unit']}, stok: {mat['stock']})")
    print()
    print("=" * 60)
    print("  CATATAN: Stok dan min_stok di-set 0 (default).")
    print("  Silakan update stok lewat Admin Panel > Stok Bahan Baku.")
    print("=" * 60)


if __name__ == '__main__':
    add_missing_materials()
