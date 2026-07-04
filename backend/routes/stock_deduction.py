"""
Utility untuk mengurangi/mengembalikan stok bahan baku
berdasarkan transaksi yang dikonfirmasi.

Flow:
1. Transaksi berisi items: [{package_slug, duration, meal_type, quantity}]
2. Dari package_slug → lookup jadwal menu (menu_schedules)
3. Dari duration + meal_type → tentukan hari & menu mana saja
4. Dari setiap menu → ambil item_details (bahan baku + qty per porsi)
5. Match nama bahan ke collection materials (case-insensitive)
6. Kurangi/kembalikan stok
"""

from bson import ObjectId
from datetime import datetime


# Mapping durasi ke jumlah hari dan pola schedule
# Schedule base = 6 hari (Senin-Sabtu)
DURATION_DAY_MAP = {
    '5 Hari': [1, 2, 3, 4, 5],
    '6 Hari': [1, 2, 3, 4, 5, 6],
    '10 Hari': [1, 2, 3, 4, 5, 6, 1, 2, 3, 4],
    '30 Hari': [1, 2, 3, 4, 5, 6] * 5,
}


def _get_menus_for_item(db, item):
    """
    Dari satu item transaksi, ambil semua menu yang perlu dihitung bahan bakunya.

    Args:
        db: MongoDB database instance
        item: dict dari transaction.items[] dengan keys:
              package_slug, duration, meal_type, quantity

    Returns:
        list of menu documents dari collection menus
    """
    package_slug = item.get('package_slug', '')
    duration = item.get('duration', '')
    meal_type = item.get('meal_type', '').lower()  # 'lunch', 'dinner', 'lunch & dinner'

    # Ambil jadwal menu untuk paket ini
    schedule_doc = db['menu_schedules'].find_one(
        {'package_slug': package_slug},
        sort=[('updated_at', -1)]
    )

    if not schedule_doc or 'schedule' not in schedule_doc:
        print(f"[STOCK] Schedule tidak ditemukan untuk paket: {package_slug}")
        return []

    schedule = schedule_doc['schedule']  # list of 6 days

    # Tentukan hari mana saja berdasarkan durasi
    day_numbers = DURATION_DAY_MAP.get(duration, [])
    if not day_numbers:
        # Fallback: coba parse angka dari string durasi
        try:
            num_days = int(''.join(filter(str.isdigit, duration)))
            if num_days <= 6:
                day_numbers = list(range(1, num_days + 1))
            else:
                # Cycle melalui 6 hari
                day_numbers = []
                for i in range(num_days):
                    day_numbers.append((i % 6) + 1)
        except (ValueError, TypeError):
            print(f"[STOCK] Durasi tidak dikenali: {duration}")
            return []

    # Kumpulkan menu_id dari hari-hari yang relevan
    menu_ids = []
    for day_num in day_numbers:
        # Cari day di schedule (day_number = 1-6)
        day_entry = None
        for d in schedule:
            if d.get('day_number') == day_num:
                day_entry = d
                break

        if not day_entry:
            continue

        # Tentukan menu berdasarkan meal_type
        if meal_type in ['lunch', 'lunch & dinner']:
            mid = day_entry.get('lunch_menu_id', '')
            if mid:
                menu_ids.append(mid)

        if meal_type in ['dinner', 'lunch & dinner']:
            mid = day_entry.get('dinner_menu_id', '')
            if mid:
                menu_ids.append(mid)

    # Fetch semua menu dari database
    menus = []
    for mid in menu_ids:
        try:
            menu = db['menus'].find_one({'_id': ObjectId(mid)})
            if menu:
                menus.append(menu)
        except Exception:
            continue

    return menus


def _calculate_materials_needed(menus, quantity=1):
    """
    Dari list menu, hitung total kebutuhan bahan baku.

    Args:
        menus: list of menu documents
        quantity: jumlah paket yang dipesan (multiplier)

    Returns:
        dict: {(name_lower, unit_lower): {'name': str, 'quantity': float, 'unit': str}}
    """
    materials_needed = {}

    for menu in menus:
        item_details = menu.get('item_details', [])
        if not item_details:
            continue

        for item in item_details:
            name = item.get('name', '').strip()
            if not name:
                continue

            raw_qty = item.get('quantity', '')
            try:
                qty = float(raw_qty)
            except (ValueError, TypeError):
                qty = 0

            if qty <= 0:
                continue

            unit = item.get('unit', 'gram').strip()
            total_qty = qty * quantity

            # Aggregate by (name_lower, unit_lower)
            key = (name.lower(), unit.lower())
            if key not in materials_needed:
                materials_needed[key] = {
                    'name': name,
                    'quantity': 0,
                    'unit': unit,
                }
            materials_needed[key]['quantity'] += total_qty

    return materials_needed


def deduct_stock_for_transaction(db, transaction):
    """
    Kurangi stok bahan baku berdasarkan transaksi.

    Args:
        db: MongoDB database instance
        transaction: document transaksi dari collection transactions

    Returns:
        dict: {
            'success': bool,
            'deducted_count': int,
            'not_found': list of str (nama bahan yang tidak ditemukan),
            'details': list of dict
        }
    """
    order_id = transaction.get('order_id', 'unknown')
    items = transaction.get('items', [])

    if not items:
        return {'success': True, 'deducted_count': 0, 'not_found': [], 'details': []}

    # Kumpulkan semua bahan baku yang dibutuhkan dari semua item transaksi
    all_materials = {}

    for item in items:
        menus = _get_menus_for_item(db, item)
        qty = item.get('quantity', 1)
        item_materials = _calculate_materials_needed(menus, quantity=qty)

        # Merge ke total
        for key, val in item_materials.items():
            if key not in all_materials:
                all_materials[key] = {
                    'name': val['name'],
                    'quantity': 0,
                    'unit': val['unit'],
                }
            all_materials[key]['quantity'] += val['quantity']

    if not all_materials:
        print(f"[STOCK] Tidak ada bahan baku untuk dideduct (order: {order_id})")
        return {'success': True, 'deducted_count': 0, 'not_found': [], 'details': []}

    # Kurangi stok di collection materials
    deducted_count = 0
    not_found = []
    details = []
    now = datetime.now()

    for (name_lower, unit_lower), mat_info in all_materials.items():
        qty_to_deduct = mat_info['quantity']

        # Case-insensitive match by name
        result = db['materials'].update_one(
            {'name': {'$regex': f'^{_escape_regex(name_lower)}$', '$options': 'i'}},
            {'$inc': {'stock': -qty_to_deduct}}
        )

        if result.matched_count > 0:
            deducted_count += 1
            details.append({
                'material_name': mat_info['name'],
                'quantity_deducted': round(qty_to_deduct, 2),
                'unit': mat_info['unit'],
            })

            # Log pengurangan stok
            db['stock_logs'].insert_one({
                'order_id': order_id,
                'material_name': mat_info['name'],
                'quantity': round(qty_to_deduct, 2),
                'unit': mat_info['unit'],
                'type': 'deduction',
                'created_at': now,
            })
        else:
            not_found.append(mat_info['name'])
            print(f"[STOCK WARNING] Bahan '{mat_info['name']}' tidak ditemukan di materials (order: {order_id})")

    # Tandai transaksi sudah di-deduct
    db['transactions'].update_one(
        {'_id': transaction['_id']},
        {'$set': {'stock_deducted': True, 'stock_deducted_at': now}}
    )

    print(f"[STOCK OK] Order {order_id}: {deducted_count} bahan dikurangi, {len(not_found)} tidak ditemukan")
    return {
        'success': True,
        'deducted_count': deducted_count,
        'not_found': not_found,
        'details': details,
    }


def restore_stock_for_transaction(db, transaction):
    """
    Kembalikan stok bahan baku jika transaksi dibatalkan.
    Hanya jika transaksi sudah pernah di-deduct (stock_deducted=True).

    Args:
        db: MongoDB database instance
        transaction: document transaksi

    Returns:
        dict: hasil restorasi
    """
    order_id = transaction.get('order_id', 'unknown')

    if not transaction.get('stock_deducted'):
        print(f"[STOCK] Order {order_id} belum pernah deduct stok, skip restore")
        return {'success': True, 'restored_count': 0}

    items = transaction.get('items', [])
    if not items:
        return {'success': True, 'restored_count': 0}

    # Hitung ulang bahan yang perlu dikembalikan
    all_materials = {}
    for item in items:
        menus = _get_menus_for_item(db, item)
        qty = item.get('quantity', 1)
        item_materials = _calculate_materials_needed(menus, quantity=qty)

        for key, val in item_materials.items():
            if key not in all_materials:
                all_materials[key] = {
                    'name': val['name'],
                    'quantity': 0,
                    'unit': val['unit'],
                }
            all_materials[key]['quantity'] += val['quantity']

    # Tambahkan kembali stok
    restored_count = 0
    now = datetime.now()

    for (name_lower, unit_lower), mat_info in all_materials.items():
        qty_to_restore = mat_info['quantity']

        result = db['materials'].update_one(
            {'name': {'$regex': f'^{_escape_regex(name_lower)}$', '$options': 'i'}},
            {'$inc': {'stock': qty_to_restore}}
        )

        if result.matched_count > 0:
            restored_count += 1

            db['stock_logs'].insert_one({
                'order_id': order_id,
                'material_name': mat_info['name'],
                'quantity': round(qty_to_restore, 2),
                'unit': mat_info['unit'],
                'type': 'restoration',
                'created_at': now,
            })

    # Tandai transaksi sudah di-restore
    db['transactions'].update_one(
        {'_id': transaction['_id']},
        {'$set': {
            'stock_deducted': False,
            'stock_restored_at': now,
        }}
    )

    print(f"[STOCK RESTORE] Order {order_id}: {restored_count} bahan dikembalikan")
    return {'success': True, 'restored_count': restored_count}


def _escape_regex(text):
    """Escape special regex characters in a string."""
    import re
    return re.escape(text)
