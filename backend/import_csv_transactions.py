"""
Import CSV Transaksi Real -> MongoDB
====================================
Membaca file dataset_transaksi_nutrilicious.csv dan memasukkannya
ke collection 'transactions' di MongoDB.

Kolom yang tidak ada di CSV diisi dengan nilai default:
- status: 'delivered'
- payment_status: 'PAID'
- xendit_invoice_id: ''
- xendit_invoice_url: ''
- user_id: 'csv_import'
- customer_address: ''
- customer_notes: ''

Jalankan: python import_csv_transactions.py
"""

import csv
import os
from datetime import datetime, timedelta
import random

from dotenv import load_dotenv
load_dotenv()

from db import get_db

# Path ke file CSV
CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'dataset_transaksi_nutrilicious.csv')

# Mapping nama_paket -> package_slug
PACKAGE_SLUG_MAP = {
    'Healthy Food': 'healthy-food',
    'Low Carbs': 'low-carbs',
    'Muscle Gain': 'muscle-gain',
}


def parse_csv_row(row):
    """
    Konversi satu baris CSV ke format dokumen MongoDB transaction.
    """
    # Parse tanggal -> datetime dengan jam random (untuk realisme)
    date_str = row['tanggal'].strip()
    try:
        tanggal = datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        tanggal = datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
    hour = random.randint(7, 21)
    minute = random.randint(0, 59)
    second = random.randint(0, 59)
    created_at = tanggal.replace(hour=hour, minute=minute, second=second)

    # Parse harga
    harga = int(row['harga'])

    # Generate package_slug dari nama_paket
    nama_paket = row['nama_paket']
    package_slug = PACKAGE_SLUG_MAP.get(nama_paket, nama_paket.lower().replace(' ', '-'))

    return {
        'order_id': row['id_pesanan'],
        'user_id': 'csv_import',
        'customer_name': row['nama_pelanggan'],
        'customer_phone': row['no_telepon'],
        'customer_address': '',
        'customer_notes': '',
        'items': [{
            'package_name': nama_paket,
            'package_slug': package_slug,
            'duration': row['durasi'],
            'meal_type': row['tipe_makan'],
            'price': harga,
            'quantity': 1,
            'subtotal': harga,
        }],
        'total': harga,
        'status': 'delivered',
        'payment_method': row['metode_pembayaran'],
        'payment_status': 'PAID',
        'xendit_invoice_id': '',
        'xendit_invoice_url': '',
        'created_at': created_at,
        'updated_at': created_at + timedelta(hours=random.randint(1, 48)),
    }


def import_csv():
    """Import semua data CSV ke MongoDB."""
    db = get_db()
    collection = db['transactions']

    print("=" * 60)
    print("  IMPORT CSV TRANSAKSI REAL -> MONGODB")
    print("=" * 60)
    print()

    # 1. Baca CSV
    print(f"[1/3] Membaca CSV: {CSV_PATH}")
    if not os.path.exists(CSV_PATH):
        print(f"  [ERROR] File tidak ditemukan: {CSV_PATH}")
        return

    transactions = []
    pkg_counts = {}

    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            txn = parse_csv_row(row)
            transactions.append(txn)

            # Hitung per paket
            slug = txn['items'][0]['package_slug']
            pkg_counts[slug] = pkg_counts.get(slug, 0) + 1

    print(f"      Total baris CSV: {len(transactions)}")
    print()
    print("  Distribusi per paket:")
    for slug, count in sorted(pkg_counts.items()):
        pct = count / len(transactions) * 100
        print(f"    - {slug}: {count} ({pct:.1f}%)")

    # 2. Hapus semua transaksi lama
    print()
    print("[2/3] Menghapus SEMUA transaksi lama di MongoDB...")
    delete_result = collection.delete_many({})
    print(f"      Dihapus: {delete_result.deleted_count} dokumen")

    # 3. Insert data CSV
    print()
    print("[3/3] Memasukkan data CSV ke MongoDB...")

    batch_size = 500
    for i in range(0, len(transactions), batch_size):
        batch = transactions[i:i + batch_size]
        collection.insert_many(batch)
        print(f"      Batch {i // batch_size + 1}: inserted {len(batch)} docs")

    # Verifikasi
    total_in_db = collection.count_documents({})
    print()
    print("=" * 60)
    print(f"  ✅ SELESAI!")
    print(f"  Total di CSV     : {len(transactions)} transaksi")
    print(f"  Total di MongoDB : {total_in_db} transaksi")
    print(f"  Status semua     : delivered")
    print(f"  Payment status   : PAID")
    print()

    # Tampilkan range tanggal
    first_date = min(t['created_at'] for t in transactions)
    last_date = max(t['created_at'] for t in transactions)
    print(f"  Periode: {first_date.strftime('%d %b %Y')} - {last_date.strftime('%d %b %Y')}")
    print("=" * 60)


if __name__ == '__main__':
    random.seed(42)  # Untuk reproducibility
    import_csv()
