"""
Script untuk mengubah semua data teks huruf kapital menjadi huruf kecil
pada file dataset_transaksi_nutrilicious_cs.xls
"""
import pandas as pd

# Baca file Excel
print("Membaca file Excel...")
df = pd.read_excel('dataset_transaksi_nutrilicious_cs.xls')
print(f"Total baris: {len(df)}")
print(f"Kolom: {list(df.columns)}")

# Preview sebelum konversi
print("\n=== SEBELUM KONVERSI ===")
print(df.head(3).to_string())

# Ubah semua kolom bertipe string (object) menjadi huruf kecil
text_columns = df.select_dtypes(include=['object']).columns
print(f"\nKolom teks yang akan diubah: {list(text_columns)}")

for col in text_columns:
    df[col] = df[col].astype(str).str.lower()

# Preview setelah konversi
print("\n=== SETELAH KONVERSI ===")
print(df.head(3).to_string())

# Simpan ke file baru (.xlsx)
output_file = 'dataset_transaksi_nutrilicious_lowercase.xlsx'
df.to_excel(output_file, index=False)
print(f"\n[OK] File berhasil disimpan sebagai: {output_file}")
print(f"Total {len(df)} baris data telah diubah ke huruf kecil.")
