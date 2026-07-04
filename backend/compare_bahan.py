"""Script untuk membandingkan bahan di menu vs materials collection"""
from dotenv import load_dotenv
load_dotenv()
from db import get_db

db = get_db()

# Ambil semua menu dan item_details
menus = list(db['menus'].find({}, {'title': 1, 'item_details': 1}))
materials = list(db['materials'].find({}, {'name': 1, 'unit': 1, 'stock': 1}))

# Kumpulkan semua nama bahan unik dari item_details
bahan_menu = set()
bahan_per_menu = {}
for m in menus:
    title = m.get('title', 'Unknown')
    details = m.get('item_details', [])
    for d in details:
        name = d.get('name', '').strip()
        if name:
            bahan_menu.add(name.lower())
            if name.lower() not in bahan_per_menu:
                bahan_per_menu[name.lower()] = name

# Buat set nama materials
mat_names = {}
for m in materials:
    mat_names[m['name'].strip().lower()] = m['name']

# Bandingkan
matched = []
unmatched = []
for b in sorted(bahan_menu):
    if b in mat_names:
        matched.append((bahan_per_menu[b], mat_names[b]))
    else:
        unmatched.append(bahan_per_menu[b])

print("=" * 60)
print("PERBANDINGAN BAHAN MENU vs MATERIALS")
print("=" * 60)

print(f"\nCOCOK ({len(matched)}):")
for menu_name, mat_name in matched:
    print(f"  OK  {menu_name}  ->  {mat_name}")

print(f"\nTIDAK COCOK ({len(unmatched)}) - bahan di menu tapi TIDAK ADA di materials:")
for name in unmatched:
    print(f"  !!  {name}")

print(f"\n{'=' * 60}")
print(f"DAFTAR MATERIALS YANG SUDAH ADA ({len(materials)}):")
print("=" * 60)
for m in sorted(materials, key=lambda x: x['name']):
    print(f"  {m['name']} ({m['unit']}, stok: {m['stock']})")
