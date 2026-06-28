"""
Seed Transaksi Historis 24 Bulan
================================
Generate data transaksi dummy yang realistis untuk training model
prediksi penjualan Random Forest.

Periode: Juni 2024 - Mei 2026 (104 minggu)
Jumlah: ~10.000-12.000 transaksi

Pola yang ditanamkan:
- Tren naik (bisnis tumbuh)
- Musiman (bulan tertentu lebih ramai)
- Pola gajian (awal bulan lebih ramai)
- Distribusi paket: Healthy Food 55%, Low Carbs 25%, Muscle Gain 20%
- Noise rendah (±5-10%) agar model belajar dengan baik

Jalankan: python seed_transactions.py
"""

import random
import math
from datetime import datetime, timedelta

from dotenv import load_dotenv
load_dotenv()

from db import get_db

# Seed random untuk reproducibility
random.seed(42)

# ============================================================
# KONFIGURASI
# ============================================================

START_DATE = datetime(2024, 6, 1)   # Mulai: 1 Juni 2024
END_DATE = datetime(2026, 5, 31)    # Akhir: 31 Mei 2026

# Distribusi paket (total harus = 1.0)
PACKAGE_CONFIG = {
    'healthy-food': {
        'name': 'Healthy Food',
        'weight': 0.55,         # 55% dari total pesanan
        'base_weekly': 35,      # basis pesanan per minggu
        'trend_rate': 0.50,     # pertumbuhan +0.50 per minggu
    },
    'low-carbs': {
        'name': 'Low Carbs',
        'weight': 0.25,         # 25% dari total pesanan
        'base_weekly': 18,
        'trend_rate': 0.35,     # pertumbuhan +0.35 per minggu
    },
    'muscle-gain': {
        'name': 'Muscle Gain',
        'weight': 0.20,         # 20% dari total pesanan
        'base_weekly': 14,
        'trend_rate': 0.30,     # pertumbuhan +0.30 per minggu
    },
}

# Pricing per paket per durasi per meal type (harga promo)
PRICING = {
    'healthy-food': {
        '5 Hari':  {'Lunch': 150000, 'Dinner': 150000, 'Lunch & Dinner': 290000},
        '6 Hari':  {'Lunch': 175000, 'Dinner': 175000, 'Lunch & Dinner': 345000},
        '10 Hari': {'Lunch': 290000, 'Dinner': 290000, 'Lunch & Dinner': 570000},
        '30 Hari': {'Lunch': 860000, 'Dinner': 860000, 'Lunch & Dinner': 1700000},
    },
    'low-carbs': {
        '5 Hari':  {'Lunch': 150000, 'Dinner': 150000, 'Lunch & Dinner': 290000},
        '6 Hari':  {'Lunch': 175000, 'Dinner': 175000, 'Lunch & Dinner': 345000},
        '10 Hari': {'Lunch': 290000, 'Dinner': 290000, 'Lunch & Dinner': 570000},
        '30 Hari': {'Lunch': 860000, 'Dinner': 860000, 'Lunch & Dinner': 1700000},
    },
    'muscle-gain': {
        '5 Hari':  {'Lunch': 225000, 'Dinner': 225000, 'Lunch & Dinner': 440000},
        '6 Hari':  {'Lunch': 265000, 'Dinner': 265000, 'Lunch & Dinner': 520000},
        '10 Hari': {'Lunch': 440000, 'Dinner': 440000, 'Lunch & Dinner': 865000},
        '30 Hari': {'Lunch': 1310000, 'Dinner': 1310000, 'Lunch & Dinner': 2590000},
    },
}

# Durasi dan meal type dengan probabilitas
DURATION_WEIGHTS = [
    ('5 Hari', 0.35),
    ('6 Hari', 0.25),
    ('10 Hari', 0.25),
    ('30 Hari', 0.15),
]

MEAL_TYPE_WEIGHTS = [
    ('Lunch', 0.40),
    ('Dinner', 0.25),
    ('Lunch & Dinner', 0.35),
]

# Status transaksi yang sukses
SUCCESS_STATUSES = ['delivered', 'confirmed']
STATUS_WEIGHTS = [0.75, 0.25]  # 75% delivered, 25% confirmed

# Daftar nama Indonesia untuk customer
CUSTOMER_NAMES = [
    "Andi Pratama", "Siti Nurhaliza", "Budi Santoso", "Dewi Lestari",
    "Rizky Hidayat", "Putri Maharani", "Fajar Nugroho", "Ratna Sari",
    "Ahmad Fauzi", "Maya Anggraini", "Dimas Prasetyo", "Ayu Puspita",
    "Hendra Wijaya", "Rina Melati", "Yoga Aditya", "Fitri Handayani",
    "Bayu Setiawan", "Nadia Kusuma", "Reza Firmansyah", "Indah Permata",
    "Gilang Ramadhan", "Wulan Dari", "Arif Rahman", "Citra Dewi",
    "Taufik Ismail", "Sari Rahayu", "Doni Saputra", "Laras Wati",
    "Eko Prasetyo", "Annisa Zahra", "Kevin Susanto", "Diana Putri",
    "Joko Widodo", "Mela Safitri", "Hadi Purnomo", "Tia Anggraeni",
    "Surya Darma", "Lina Marlina", "Bambang Trihatmojo", "Rini Widyastuti",
]

PHONE_PREFIXES = ["0812", "0813", "0857", "0858", "0878", "0877", "0821", "0822"]


# ============================================================
# FUNGSI HELPER
# ============================================================

def weighted_choice(choices_weights):
    """Pilih item berdasarkan bobot probabilitas."""
    items = [c[0] for c in choices_weights]
    weights = [c[1] for c in choices_weights]
    return random.choices(items, weights=weights, k=1)[0]


def get_seasonal_multiplier(month):
    """
    Multiplier musiman berdasarkan bulan.
    Januari tinggi (resolusi sehat), Maret-April Ramadan turun,
    Mei pasca-Lebaran naik, dst.
    """
    seasonal = {
        1: 1.35,   # Januari: resolusi tahun baru, diet sehat — puncak
        2: 1.20,   # Februari: masih semangat
        3: 0.75,   # Maret: Ramadan mulai, pesanan turun signifikan
        4: 0.65,   # April: puasa penuh — titik terendah
        5: 1.25,   # Mei: pasca-Lebaran, kembali diet kuat
        6: 1.00,   # Juni: normal
        7: 1.10,   # Juli: naik (holiday fitness)
        8: 0.95,   # Agustus: sedikit turun
        9: 1.10,   # September: naik lagi
        10: 1.20,  # Oktober: naik menjelang akhir tahun
        11: 1.15,  # November: stabil tinggi
        12: 0.85,  # Desember: libur, turun
    }
    return seasonal.get(month, 1.0)


def get_week_of_month(date):
    """Hitung minggu ke berapa dalam bulan (1-5)."""
    return (date.day - 1) // 7 + 1


def get_payday_multiplier(date):
    """
    Multiplier efek gajian: awal bulan (tanggal 1-14) lebih ramai.
    """
    if date.day <= 7:
        return 1.22   # Minggu pertama: +22% (efek gajian kuat)
    elif date.day <= 14:
        return 1.10   # Minggu kedua: +10%
    elif date.day <= 21:
        return 0.88   # Minggu ketiga: -12%
    else:
        return 0.80   # Minggu keempat: -20%


def generate_phone():
    """Generate nomor telepon Indonesia random."""
    prefix = random.choice(PHONE_PREFIXES)
    suffix = ''.join([str(random.randint(0, 9)) for _ in range(8)])
    return f"{prefix}{suffix}"


def generate_order_id(date, seq):
    """Generate order ID format NTR-YYYYMMDD-XXX."""
    return f"NTR-{date.strftime('%Y%m%d')}-{seq:03d}"


# ============================================================
# FUNGSI UTAMA: GENERATE TRANSAKSI
# ============================================================

def calculate_weekly_orders(week_index, month, date, package_slug):
    """
    Hitung jumlah pesanan untuk 1 paket pada 1 minggu tertentu.
    Kombinasi: base + trend + seasonal + payday + noise.
    """
    config = PACKAGE_CONFIG[package_slug]
    base = config['base_weekly']

    # 1. Tren naik: per-paket trend rate (bisnis tumbuh kuat)
    trend_rate = config.get('trend_rate', 0.25)
    trend = week_index * trend_rate

    # 2. Musiman bulanan (efek kuat)
    seasonal = base * (get_seasonal_multiplier(month) - 1.0)

    # 3. Pola gajian (awal bulan)
    payday = base * (get_payday_multiplier(date) - 1.0)

    # 4. Noise acak realistis (±0.5 pesanan — fixed, bukan persentase)
    noise = random.gauss(0, 0.5)

    total = base + trend + seasonal + payday + noise
    return max(1, round(total))  # minimal 1 pesanan


def generate_transactions():
    """Generate semua transaksi untuk 12 bulan."""
    all_transactions = []
    order_counters = {}  # {date_str: counter}
    
    current_date = START_DATE
    week_index = 0

    while current_date <= END_DATE:
        # Tentukan minggu ini (Senin-Minggu)
        week_start = current_date - timedelta(days=current_date.weekday())
        week_end = week_start + timedelta(days=6)
        month = current_date.month

        for package_slug, config in PACKAGE_CONFIG.items():
            # Hitung target pesanan minggu ini untuk paket ini
            target_orders = calculate_weekly_orders(
                week_index, month, current_date, package_slug
            )

            # Generate transaksi individual tersebar di hari-hari dalam minggu
            for _ in range(target_orders):
                # Pilih hari random dalam minggu ini
                day_offset = random.randint(0, 6)
                txn_date = week_start + timedelta(days=day_offset)
                
                # Pastikan masih dalam range
                if txn_date < START_DATE or txn_date > END_DATE:
                    continue

                # Pilih waktu random dalam hari
                hour = random.randint(7, 21)
                minute = random.randint(0, 59)
                second = random.randint(0, 59)
                txn_datetime = txn_date.replace(hour=hour, minute=minute, second=second)

                # Generate order_id
                date_str = txn_date.strftime('%Y%m%d')
                if date_str not in order_counters:
                    order_counters[date_str] = 0
                order_counters[date_str] += 1
                order_id = f"NTR-{date_str}-{order_counters[date_str]:03d}"

                # Pilih durasi dan meal type
                duration = weighted_choice(DURATION_WEIGHTS)
                meal_type = weighted_choice(MEAL_TYPE_WEIGHTS)
                price = PRICING[package_slug][duration][meal_type]

                # Pilih customer
                customer_name = random.choice(CUSTOMER_NAMES)
                customer_phone = generate_phone()

                # Pilih status
                status = random.choices(
                    SUCCESS_STATUSES, weights=STATUS_WEIGHTS, k=1
                )[0]

                # Buat transaksi
                txn = {
                    'order_id': order_id,
                    'user_id': f'user_{random.randint(1, 50)}',
                    'customer_name': customer_name,
                    'customer_phone': customer_phone,
                    'customer_address': f'Jl. Contoh No. {random.randint(1, 200)}, Jakarta',
                    'customer_notes': '',
                    'items': [{
                        'package_name': config['name'],
                        'package_slug': package_slug,
                        'duration': duration,
                        'meal_type': meal_type,
                        'price': price,
                        'quantity': 1,
                        'subtotal': price,
                    }],
                    'total': price,
                    'status': status,
                    'payment_method': random.choice([
                        'QRIS', 'Bank Transfer - BCA', 'Bank Transfer - Mandiri',
                        'Bank Transfer - BNI', 'OVO', 'GoPay', 'Dana'
                    ]),
                    'payment_status': 'PAID' if status == 'delivered' else 'SETTLED',
                    'xendit_invoice_id': '',
                    'xendit_invoice_url': '',
                    'created_at': txn_datetime,
                    'updated_at': txn_datetime + timedelta(hours=random.randint(1, 48)),
                }

                all_transactions.append(txn)

        # Pindah ke minggu berikutnya
        current_date += timedelta(weeks=1)
        week_index += 1

    return all_transactions


def seed_transactions():
    """Seed transaksi ke MongoDB."""
    db = get_db()
    collection = db['transactions']

    print("=" * 55)
    print("  SEED TRANSAKSI HISTORIS 24 BULAN")
    print("  Periode: Juni 2024 - Mei 2026")
    print("=" * 55)
    print()

    # Generate transaksi
    print("[1/3] Generating transaksi dummy...")
    transactions = generate_transactions()
    print(f"      Generated {len(transactions)} transaksi")

    # Hitung statistik per paket
    pkg_counts = {}
    for t in transactions:
        slug = t['items'][0]['package_slug']
        pkg_counts[slug] = pkg_counts.get(slug, 0) + 1

    print()
    print("  Distribusi per paket:")
    for slug, count in sorted(pkg_counts.items()):
        pct = count / len(transactions) * 100
        print(f"    - {slug}: {count} ({pct:.1f}%)")

    # Hapus data transaksi lama (opsional, hanya yang dari seed)
    print()
    print("[2/3] Menghapus transaksi lama dari seed...")
    # Hapus transaksi yang created_at di range seed
    delete_result = collection.delete_many({
        'created_at': {
            '$gte': START_DATE,
            '$lte': END_DATE + timedelta(days=1)
        }
    })
    print(f"      Dihapus {delete_result.deleted_count} transaksi lama")

    # Insert batch
    print()
    print("[3/3] Inserting transaksi ke MongoDB...")
    
    # Insert dalam batch 500
    batch_size = 500
    for i in range(0, len(transactions), batch_size):
        batch = transactions[i:i + batch_size]
        collection.insert_many(batch)
        print(f"      Batch {i // batch_size + 1}: inserted {len(batch)} docs")

    print()
    print("=" * 55)
    print(f"  [DONE] Total {len(transactions)} transaksi berhasil di-seed!")
    print(f"  Periode: {START_DATE.strftime('%d %b %Y')} - {END_DATE.strftime('%d %b %Y')}")
    print(f"  Collection: transactions")
    print("=" * 55)


if __name__ == '__main__':
    seed_transactions()
