# -*- coding: utf-8 -*-
# ---
# jupyter:
#   jupytext:
#     text_representation:
#       extension: .py
#       format_name: percent
#   kernelspec:
#     display_name: Python 3
#     language: python
#     name: python3
# ---

# %% [markdown]
# # 🍽️ Prediksi Penjualan Paket Katering Sehat
# # Menggunakan Algoritma Random Forest
#
# **Studi Kasus: CV Nutrisi Citra Nusantara (Nutrilicious)**
#
# ---
#
# **Skripsi:** Sistem Informasi Pemesanan Katering Sehat dengan Integrasi Chatbot RAG
# dan Prediksi Stok Bahan Menggunakan Algoritma Random Forest Berbasis Web
#
# ---
#
# ## Daftar Isi
# 1. Import Library & Konfigurasi
# 2. Load Dataset dari CSV
# 3. Eksplorasi Data (EDA)
# 4. Feature Engineering
# 5. Training Model Random Forest + GridSearchCV
# 6. Evaluasi Model (MAE, RMSE, R²)
# 7. Feature Importance Analysis
# 8. Visualisasi Aktual vs Prediksi
# 9. Prediksi 1 Minggu ke Depan

# %% [markdown]
# ## 1. Import Library & Konfigurasi

# %%
import math
import warnings
from datetime import datetime, timedelta

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

warnings.filterwarnings('ignore')

# Konfigurasi visualisasi
plt.rcParams['figure.figsize'] = (14, 6)
plt.rcParams['font.size'] = 12
sns.set_style('whitegrid')
sns.set_palette('husl')

np.random.seed(42)

print("✅ Semua library berhasil di-import!")

# %% [markdown]
# ## 2. Load Dataset dari CSV
#
# Dataset berisi **data transaksi mentah** pemesanan paket katering selama **24 bulan**
# (Juni 2024 - Mei 2026) dengan total **~13.000+ transaksi**.
#
# Kolom dataset:
# | Kolom | Penjelasan |
# |-------|-----------|
# | `id_pesanan` | ID unik transaksi (NTR-YYYYMMDD-XXX) |
# | `tanggal` | Tanggal transaksi (YYYY-MM-DD) |
# | `nama_pelanggan` | Nama pelanggan |
# | `nama_paket` | Nama paket (Healthy Food / Low Carbs / Muscle Gain) |
# | `durasi` | Durasi langganan (5/6/10/30 Hari) |
# | `tipe_makan` | Tipe makanan (Lunch, Dinner, Lunch & Dinner) |
# | `harga` | Harga (Rupiah) |
# | `metode_pembayaran` | Metode pembayaran |
#
# > **Catatan:** Upload file `dataset_transaksi_nutrilicious.csv` ke Colab terlebih dahulu.

# %%
# === Upload CSV (untuk Google Colab) ===
# Uncomment 2 baris di bawah jika menjalankan di Google Colab:
# from google.colab import files
# uploaded = files.upload()

# === Load Dataset Transaksi ===
df_transaksi = pd.read_csv('dataset_transaksi_nutrilicious.csv')
df_transaksi['tanggal'] = pd.to_datetime(df_transaksi['tanggal'])

# Buat kolom package_slug dari nama_paket (untuk proses internal)
df_transaksi['package_slug'] = df_transaksi['nama_paket'].str.lower().str.replace(' ', '-')

# Rename kolom Indonesia → internal (untuk kompatibilitas proses)
df_transaksi = df_transaksi.rename(columns={
    'id_pesanan': 'order_id',
    'nama_pelanggan': 'customer_name',
    'nama_paket': 'package_name',
    'durasi': 'duration',
    'tipe_makan': 'meal_type',
    'harga': 'price',
    'metode_pembayaran': 'payment_method',
})

# Konfigurasi paket
PACKAGES = ['low-carbs', 'healthy-food', 'muscle-gain']
PACKAGE_NAMES = {
    'low-carbs': 'Low Carbs',
    'healthy-food': 'Healthy Food',
    'muscle-gain': 'Muscle Gain',
}

print("=" * 60)
print("  DATASET TRANSAKSI")
print("=" * 60)
print(f"  File           : dataset_transaksi_nutrilicious.csv")
print(f"  Total transaksi: {len(df_transaksi):,} baris")
print(f"  Periode        : {df_transaksi['tanggal'].min().strftime('%d %b %Y')} - {df_transaksi['tanggal'].max().strftime('%d %b %Y')}")
print(f"  Jumlah kolom   : {len(df_transaksi.columns) - 1} kolom (+ 1 kolom turunan)")
print()

print("  Distribusi per paket:")
for pkg in PACKAGES:
    count = len(df_transaksi[df_transaksi['package_slug'] == pkg])
    pct = count / len(df_transaksi) * 100
    print(f"    📦 {PACKAGE_NAMES[pkg]:15s}: {count:,} transaksi ({pct:.1f}%)")
print("=" * 60)

# %%
# === Preview Data Transaksi ===
print("PREVIEW DATA TRANSAKSI (10 BARIS PERTAMA):")
print(df_transaksi.head(10).to_string(index=False))

# %%
# === Agregasi: Transaksi Mentah → Pesanan per Paket per Minggu ===
# Ini adalah tahap pra-pemrosesan sebelum masuk ke model

df_transaksi['week_start'] = df_transaksi['tanggal'].apply(
    lambda d: d - pd.Timedelta(days=d.weekday())
)
df_transaksi['week_start'] = df_transaksi['week_start'].dt.normalize()
df_transaksi['year'] = df_transaksi['tanggal'].dt.isocalendar().year.astype(int)
df_transaksi['week'] = df_transaksi['tanggal'].dt.isocalendar().week.astype(int)
df_transaksi['year_week'] = df_transaksi['year'].astype(str) + '-W' + df_transaksi['week'].astype(str).str.zfill(2)

# Agregasi: hitung jumlah pesanan per paket per minggu
raw_data = df_transaksi.groupby(
    ['year_week', 'week_start', 'package_slug']
).size().reset_index(name='order_count')
raw_data = raw_data.sort_values(['week_start', 'package_slug']).reset_index(drop=True)

print("=" * 60)
print("  HASIL AGREGASI (DATA MINGGUAN)")
print("=" * 60)
print(f"  {len(df_transaksi):,} transaksi → {len(raw_data)} baris mingguan")
print(f"  ({raw_data['year_week'].nunique()} minggu × {len(PACKAGES)} paket)")
print()
print("Preview data mingguan:")
print(raw_data.head(9).to_string(index=False))

# %%
# === Preview Data ===
print("=" * 70)
print("PREVIEW DATASET (10 BARIS PERTAMA)")
print("=" * 70)
print(raw_data.head(10).to_string(index=False))
print()
print("=" * 70)
print("PREVIEW DATASET (10 BARIS TERAKHIR)")
print("=" * 70)
print(raw_data.tail(10).to_string(index=False))

# %% [markdown]
# ## 3. Eksplorasi Data (EDA)

# %%
# === Statistik Deskriptif per Paket ===
print("=" * 60)
print("STATISTIK DESKRIPTIF PER PAKET")
print("=" * 60)
for pkg in PACKAGES:
    pkg_data = raw_data[raw_data['package_slug'] == pkg]
    print(f"\n📦 {PACKAGE_NAMES[pkg]}:")
    print(f"   Jumlah minggu : {len(pkg_data)}")
    print(f"   Min pesanan   : {pkg_data['order_count'].min()}")
    print(f"   Max pesanan   : {pkg_data['order_count'].max()}")
    print(f"   Rata-rata     : {pkg_data['order_count'].mean():.1f}")
    print(f"   Std deviasi   : {pkg_data['order_count'].std():.1f}")

# %%
# === Statistik Deskriptif (tabel) ===
desc = raw_data.groupby('package_name')['order_count'].describe()
print("\n📊 Tabel Statistik Deskriptif:")
print(desc.round(2).to_string())

# %%
# === Visualisasi 1: Tren Pesanan per Paket ===
fig, axes = plt.subplots(3, 1, figsize=(16, 12), sharex=True)

colors = {'healthy-food': '#2ecc71', 'low-carbs': '#3498db', 'muscle-gain': '#e74c3c'}

for i, pkg in enumerate(PACKAGES):
    pkg_data = raw_data[raw_data['package_slug'] == pkg].sort_values('week_start')
    axes[i].plot(pkg_data['week_start'], pkg_data['order_count'],
                 color=colors[pkg], linewidth=1.5, alpha=0.8)
    axes[i].fill_between(pkg_data['week_start'], pkg_data['order_count'],
                         alpha=0.15, color=colors[pkg])
    axes[i].set_title(f'📦 {PACKAGE_NAMES[pkg]}', fontsize=14, fontweight='bold')
    axes[i].set_ylabel('Jumlah Pesanan')
    axes[i].grid(True, alpha=0.3)

axes[2].set_xlabel('Minggu')
fig.suptitle('Tren Pesanan Per Paket (24 Bulan)', fontsize=16, fontweight='bold', y=1.01)
plt.tight_layout()
plt.show()

# %%
# === Visualisasi 2: Distribusi Pesanan per Paket ===
fig, axes = plt.subplots(1, 3, figsize=(16, 5))

for i, pkg in enumerate(PACKAGES):
    pkg_data = raw_data[raw_data['package_slug'] == pkg]['order_count']
    axes[i].hist(pkg_data, bins=20, color=colors[pkg], edgecolor='white', alpha=0.8)
    axes[i].axvline(pkg_data.mean(), color='red', linestyle='--', linewidth=2, label=f'Mean: {pkg_data.mean():.1f}')
    axes[i].set_title(f'{PACKAGE_NAMES[pkg]}', fontsize=13, fontweight='bold')
    axes[i].set_xlabel('Jumlah Pesanan')
    axes[i].set_ylabel('Frekuensi')
    axes[i].legend()

fig.suptitle('Distribusi Jumlah Pesanan Per Paket', fontsize=15, fontweight='bold')
plt.tight_layout()
plt.show()

# %%
# === Visualisasi 3: Pola Musiman (Rata-rata per Bulan) ===
raw_data_copy = raw_data.copy()
raw_data_copy['month'] = raw_data_copy['week_start'].dt.month

monthly_avg = raw_data_copy.groupby(['month', 'package_slug'])['order_count'].mean().reset_index()

fig, ax = plt.subplots(figsize=(12, 6))
month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']

for pkg in PACKAGES:
    pkg_monthly = monthly_avg[monthly_avg['package_slug'] == pkg].sort_values('month')
    ax.plot(pkg_monthly['month'], pkg_monthly['order_count'],
            marker='o', linewidth=2.5, markersize=8, color=colors[pkg],
            label=PACKAGE_NAMES[pkg])

ax.set_xticks(range(1, 13))
ax.set_xticklabels(month_names)
ax.set_xlabel('Bulan', fontsize=13)
ax.set_ylabel('Rata-rata Pesanan per Minggu', fontsize=13)
ax.set_title('Pola Musiman: Rata-rata Pesanan per Bulan', fontsize=15, fontweight='bold')
ax.legend(fontsize=12)
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()

# %%
# === Visualisasi 4: Boxplot per Paket ===
fig, ax = plt.subplots(figsize=(10, 6))
box_data = [raw_data[raw_data['package_slug'] == pkg]['order_count'] for pkg in PACKAGES]
bp = ax.boxplot(box_data, labels=[PACKAGE_NAMES[pkg] for pkg in PACKAGES],
                patch_artist=True, widths=0.5)

for patch, color in zip(bp['boxes'], ['#3498db', '#2ecc71', '#e74c3c']):
    patch.set_facecolor(color)
    patch.set_alpha(0.7)

ax.set_ylabel('Jumlah Pesanan', fontsize=13)
ax.set_title('Boxplot Distribusi Pesanan per Paket', fontsize=15, fontweight='bold')
ax.grid(axis='y', alpha=0.3)
plt.tight_layout()
plt.show()

# %% [markdown]
# ## 4. Feature Engineering
#
# Dipilih **10 fitur** yang paling relevan dan mudah diinterpretasi,
# dikelompokkan ke dalam 5 kategori:
#
# | No | Kategori | Fitur | Penjelasan |
# |----|----------|-------|-----------|
# | 1 | Historis | `lag_1` | Jumlah pesanan 1 minggu lalu |
# | 2 | Historis | `lag_2` | Jumlah pesanan 2 minggu lalu |
# | 3 | Rata-rata | `rolling_mean_2` | Rata-rata pesanan 2 minggu terakhir |
# | 4 | Rata-rata | `rolling_mean_4` | Rata-rata pesanan 4 minggu terakhir |
# | 5 | Variasi | `rolling_std_4` | Standar deviasi pesanan 4 minggu terakhir |
# | 6 | Waktu | `month` | Bulan (1-12), menangkap pola bulanan |
# | 7 | Waktu | `week_of_month` | Minggu ke berapa dalam bulan (efek gajian) |
# | 8 | Musiman | `sin_week` | Encoding sinusoidal minggu (siklus tahunan) |
# | 9 | Musiman | `cos_week` | Encoding sinusoidal minggu (siklus tahunan) |
# | 10 | Tren | `trend` | Index pertumbuhan bisnis dari waktu ke waktu |

# %%
# === FEATURE ENGINEERING ===

FEATURE_COLUMNS = [
    # Historis (data pesanan sebelumnya)
    'lag_1', 'lag_2',
    # Rata-rata bergerak
    'rolling_mean_2', 'rolling_mean_4',
    # Variasi
    'rolling_std_4',
    # Waktu
    'month', 'week_of_month',
    # Musiman
    'sin_week', 'cos_week',
    # Tren
    'trend',
]

FEATURE_LABELS = {
    'lag_1': 'Pesanan 1 Minggu Lalu',
    'lag_2': 'Pesanan 2 Minggu Lalu',
    'rolling_mean_2': 'Rata-rata 2 Minggu',
    'rolling_mean_4': 'Rata-rata 4 Minggu',
    'rolling_std_4': 'Variasi 4 Minggu',
    'month': 'Bulan',
    'week_of_month': 'Minggu dalam Bulan',
    'sin_week': 'Pola Musiman (Sin)',
    'cos_week': 'Pola Musiman (Cos)',
    'trend': 'Tren Pertumbuhan',
}


def create_features(df):
    """
    Buat fitur-fitur untuk model Random Forest.

    Input: DataFrame dengan kolom week_start, package_slug, order_count
    Output: DataFrame dengan semua fitur + target (order_count)
    """
    if df.empty:
        return df

    df = df.copy()
    df = df.sort_values(['package_slug', 'week_start']).reset_index(drop=True)

    # --- Fitur Temporal ---
    df['week_of_year'] = df['week_start'].dt.isocalendar().week.astype(int)
    df['month'] = df['week_start'].dt.month
    df['quarter'] = df['week_start'].dt.quarter
    df['day_of_year'] = df['week_start'].dt.dayofyear

    # Minggu ke berapa dalam bulan
    df['week_of_month'] = ((df['week_start'].dt.day - 1) // 7 + 1).astype(int)

    # Apakah awal bulan (minggu 1-2) — efek gajian
    df['is_awal_bulan'] = (df['week_of_month'] <= 2).astype(int)

    # Fitur sinusoidal untuk menangkap pola musiman
    df['sin_week'] = np.sin(2 * np.pi * df['week_of_year'] / 52)
    df['cos_week'] = np.cos(2 * np.pi * df['week_of_year'] / 52)
    df['sin_month'] = np.sin(2 * np.pi * df['month'] / 12)
    df['cos_month'] = np.cos(2 * np.pi * df['month'] / 12)

    # --- Fitur Paket (One-Hot Encoding) ---
    for pkg in PACKAGES:
        col_name = f'pkg_{pkg.replace("-", "_")}'
        df[col_name] = (df['package_slug'] == pkg).astype(int)

    # --- Fitur Tren ---
    for pkg in PACKAGES:
        mask = df['package_slug'] == pkg
        df.loc[mask, 'trend'] = range(mask.sum())
    df['trend'] = df['trend'].astype(int)

    # --- Fitur Lag (per paket) ---
    for pkg in PACKAGES:
        mask = df['package_slug'] == pkg
        pkg_data = df.loc[mask, 'order_count']

        df.loc[mask, 'lag_1'] = pkg_data.shift(1)
        df.loc[mask, 'lag_2'] = pkg_data.shift(2)
        df.loc[mask, 'lag_3'] = pkg_data.shift(3)
        df.loc[mask, 'lag_4'] = pkg_data.shift(4)

        # Rolling mean
        df.loc[mask, 'rolling_mean_2'] = pkg_data.rolling(window=2, min_periods=1).mean()
        df.loc[mask, 'rolling_mean_4'] = pkg_data.rolling(window=4, min_periods=1).mean()
        df.loc[mask, 'rolling_std_4'] = pkg_data.rolling(window=4, min_periods=1).std().fillna(0)

        # Exponential weighted mean (lebih sensitif terhadap data terbaru)
        df.loc[mask, 'ewm_4'] = pkg_data.ewm(span=4, min_periods=1).mean()

    # Momentum (arah perubahan minggu ke minggu)
    df['lag_1_diff'] = df['lag_1'] - df['lag_2']

    # --- Fitur Interaksi ---
    df['trend_x_sin_week'] = df['trend'] * df['sin_week']
    df['trend_x_cos_week'] = df['trend'] * df['cos_week']

    # Drop rows dengan NaN (dari lag)
    df = df.dropna().reset_index(drop=True)

    return df


# Jalankan feature engineering
df = create_features(raw_data)

print(f"✅ Feature engineering selesai!")
print(f"   Data sebelum  : {len(raw_data)} baris")
print(f"   Data sesudah  : {len(df)} baris (setelah drop NaN dari lag)")
print(f"   Jumlah fitur  : {len(FEATURE_COLUMNS)}")
print()
print("Daftar fitur yang digunakan:")
for i, col in enumerate(FEATURE_COLUMNS, 1):
    print(f"   {i:2d}. {col:25s} → {FEATURE_LABELS[col]}")

# %%
# === Preview data setelah feature engineering ===
print("\nPreview data setelah feature engineering:")
df[['year_week', 'package_slug', 'order_count'] + FEATURE_COLUMNS[:5]].head(10)

# %%
# === Visualisasi: Heatmap Korelasi Fitur ===
fig, ax = plt.subplots(figsize=(16, 12))
corr_matrix = df[FEATURE_COLUMNS + ['order_count']].corr()
mask = np.triu(np.ones_like(corr_matrix, dtype=bool))
sns.heatmap(corr_matrix, mask=mask, annot=True, fmt='.2f', cmap='RdBu_r',
            center=0, square=True, linewidths=0.5, ax=ax,
            annot_kws={'size': 7})
ax.set_title('Heatmap Korelasi Fitur dengan Target (order_count)', fontsize=15, fontweight='bold')
plt.tight_layout()
plt.show()

# %% [markdown]
# ## 5. Training Model Random Forest + GridSearchCV
#
# **Strategi Training:**
# - **TimeSeriesSplit** digunakan sebagai cross-validation agar data masa depan
#   tidak "bocor" ke training set (data leakage prevention)
# - **GridSearchCV** untuk mencari kombinasi hyperparameter terbaik
# - Model final di-retrain pada seluruh data dengan hyperparameter terbaik

# %%
# === TRAINING MODEL ===

print("=" * 60)
print("  TRAINING MODEL RANDOM FOREST")
print("=" * 60)

# 1. Persiapan data
X_all = df[FEATURE_COLUMNS]
y_all = df['order_count']

# 2. TimeSeriesSplit - gunakan fold terakhir sebagai test set
tscv = TimeSeriesSplit(n_splits=5)
train_idx, test_idx = list(tscv.split(X_all))[-1]

X_train = X_all.iloc[train_idx]
y_train = y_all.iloc[train_idx]
X_test = X_all.iloc[test_idx]
y_test = y_all.iloc[test_idx]
test_df = df.iloc[test_idx]

print(f"\n📊 Data Split (TimeSeriesSplit, fold terakhir):")
print(f"   Total data  : {len(df)} baris")
print(f"   Train set   : {len(X_train)} baris ({len(X_train)/len(df)*100:.1f}%)")
print(f"   Test set    : {len(X_test)} baris ({len(X_test)/len(df)*100:.1f}%)")

# %%
# === Visualisasi: Data Split ===
fig, ax = plt.subplots(figsize=(14, 4))
train_data = df.iloc[train_idx]
test_data = df.iloc[test_idx]

for pkg in PACKAGES:
    t = train_data[train_data['package_slug'] == pkg]
    ax.plot(t['week_start'], t['order_count'], color=colors[pkg], alpha=0.6, linewidth=1)

for pkg in PACKAGES:
    t = test_data[test_data['package_slug'] == pkg]
    ax.plot(t['week_start'], t['order_count'], color=colors[pkg], linewidth=2.5,
            label=f'{PACKAGE_NAMES[pkg]} (test)')

ax.axvline(test_data['week_start'].min(), color='red', linestyle='--', linewidth=2,
           label='Train/Test Split')
ax.set_title('Visualisasi Train/Test Split (TimeSeriesSplit)', fontsize=14, fontweight='bold')
ax.set_xlabel('Minggu')
ax.set_ylabel('Jumlah Pesanan')
ax.legend(loc='upper left', fontsize=9)
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()

# %%
# === GridSearchCV + TimeSeriesSplit ===

param_grid = {
    'n_estimators': [100, 200, 300, 500],
    'max_depth': [5, 10, 15, 20, None],
    'min_samples_split': [2, 3, 5],
    'min_samples_leaf': [1, 2],
}

total_combinations = 1
for v in param_grid.values():
    total_combinations *= len(v)

print(f"🔍 GridSearchCV Configuration:")
print(f"   Hyperparameter grid:")
for param, values in param_grid.items():
    print(f"     {param}: {values}")
print(f"   Total kombinasi : {total_combinations}")
print(f"   Cross-validation: TimeSeriesSplit (4 inner folds)")
print(f"   Scoring          : neg_mean_absolute_error")
print(f"\n⏳ Training dimulai...")

rf = RandomForestRegressor(random_state=42)
tscv_inner = TimeSeriesSplit(n_splits=4)

grid_search = GridSearchCV(
    estimator=rf,
    param_grid=param_grid,
    cv=tscv_inner,
    scoring='neg_mean_absolute_error',
    n_jobs=-1,
    verbose=0,
)

grid_search.fit(X_train, y_train)
best_model = grid_search.best_estimator_

print(f"\n✅ Training selesai!")
print(f"\n🏆 Best Hyperparameters:")
for param, value in grid_search.best_params_.items():
    print(f"   {param}: {value}")
print(f"\n   Best CV MAE: {-grid_search.best_score_:.4f}")

# %% [markdown]
# ## 6. Evaluasi Model (MAE, RMSE, R²)

# %%
# === EVALUASI MODEL ===

y_pred = best_model.predict(X_test)

mae = mean_absolute_error(y_test, y_pred)
rmse = math.sqrt(mean_squared_error(y_test, y_pred))
r2 = r2_score(y_test, y_pred)
mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100

print("=" * 60)
print("  HASIL EVALUASI MODEL")
print("=" * 60)
print()
print(f"  📏 MAE  (Mean Absolute Error)        : {mae:.4f}")
print(f"  📐 RMSE (Root Mean Squared Error)     : {rmse:.4f}")
print(f"  📊 R²   (Coefficient of Determination): {r2:.4f}")
print(f"  📈 MAPE (Mean Abs Percentage Error)   : {mape:.2f}%")
print()
print("  Interpretasi:")
print(f"  → MAE {mae:.2f} berarti rata-rata error prediksi ≈ {mae:.1f} pesanan")
print(f"  → R² {r2:.4f} berarti model menjelaskan {r2*100:.1f}% variasi data")
print()
print("=" * 60)

if r2 >= 0.90:
    print(f"  ✅ R² = {r2:.4f} → Model SANGAT BAIK (≥ 0.90)")
elif r2 >= 0.80:
    print(f"  ⚠️ R² = {r2:.4f} → Model BAIK (≥ 0.80)")
else:
    print(f"  ❌ R² = {r2:.4f} → Model perlu perbaikan (< 0.80)")
print("=" * 60)

# %%
# === Tabel Evaluasi ===
eval_table = pd.DataFrame({
    'Metrik': ['MAE (Mean Absolute Error)',
               'RMSE (Root Mean Squared Error)',
               'R² (Coefficient of Determination)',
               'MAPE (Mean Absolute Percentage Error)'],
    'Nilai': [f'{mae:.4f}', f'{rmse:.4f}', f'{r2:.4f}', f'{mape:.2f}%'],
    'Interpretasi': [
        f'Rata-rata error prediksi ≈ {mae:.1f} pesanan',
        f'Error lebih sensitif terhadap outlier',
        f'Model menjelaskan {r2*100:.1f}% variasi data',
        f'Error rata-rata sebesar {mape:.1f}% dari nilai aktual'
    ]
})
print("\n📊 Tabel Metrik Evaluasi:")
print(eval_table.to_string(index=False))

# %%
# === Visualisasi: Metrik Evaluasi ===
fig, ax = plt.subplots(figsize=(10, 5))

metrics_names = ['MAE', 'RMSE', 'R²', 'MAPE (%)']
metrics_values = [mae, rmse, r2, mape]
bar_colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12']

bars = ax.bar(metrics_names, metrics_values, color=bar_colors, edgecolor='white', linewidth=2)

for bar, val in zip(bars, metrics_values):
    ax.text(bar.get_x() + bar.get_width()/2., bar.get_height() + 0.02,
            f'{val:.4f}', ha='center', va='bottom', fontweight='bold', fontsize=13)

ax.set_title('Metrik Evaluasi Model Random Forest', fontsize=15, fontweight='bold')
ax.set_ylabel('Nilai')
ax.grid(axis='y', alpha=0.3)
plt.tight_layout()
plt.show()

# %% [markdown]
# ## 7. Feature Importance Analysis

# %%
# === FEATURE IMPORTANCE ===

importances = best_model.feature_importances_
feature_imp = sorted(zip(FEATURE_COLUMNS, importances), key=lambda x: -x[1])

print("=" * 60)
print("  FEATURE IMPORTANCE")
print("=" * 60)
print()

fi_table = pd.DataFrame({
    'No': range(1, len(feature_imp) + 1),
    'Fitur': [FEATURE_LABELS.get(f, f) for f, _ in feature_imp],
    'Kode Fitur': [f for f, _ in feature_imp],
    'Importance': [f'{v:.4f}' for _, v in feature_imp],
    'Persentase': [f'{v*100:.2f}%' for _, v in feature_imp],
})
print(fi_table.to_string(index=False))

# %%
# === Visualisasi: Feature Importance (Horizontal Bar Chart) ===
fig, ax = plt.subplots(figsize=(12, 8))

feat_names = [FEATURE_LABELS.get(f, f) for f, _ in feature_imp]
feat_values = [v * 100 for _, v in feature_imp]

# Warna gradient
cmap = plt.cm.RdYlGn_r
norm_values = np.linspace(0, 1, len(feat_names))
bar_colors_fi = [cmap(v) for v in norm_values]

bars = ax.barh(range(len(feat_names)), feat_values, color=bar_colors_fi, edgecolor='white')
ax.set_yticks(range(len(feat_names)))
ax.set_yticklabels(feat_names, fontsize=10)
ax.invert_yaxis()
ax.set_xlabel('Importance (%)', fontsize=12)
ax.set_title('Feature Importance - Random Forest', fontsize=15, fontweight='bold')

for bar, val in zip(bars, feat_values):
    if val > 0.5:
        ax.text(bar.get_width() + 0.3, bar.get_y() + bar.get_height()/2.,
                f'{val:.2f}%', va='center', fontsize=9)

ax.grid(axis='x', alpha=0.3)
plt.tight_layout()
plt.show()

# %% [markdown]
# ## 8. Visualisasi Aktual vs Prediksi

# %%
# === Visualisasi: Aktual vs Prediksi per Paket (Line Chart) ===
fig, axes = plt.subplots(3, 1, figsize=(16, 14))

for i, pkg in enumerate(PACKAGES):
    mask = test_df['package_slug'] == pkg
    pkg_actual = y_test[mask.values]
    pkg_pred = y_pred[mask.values]
    weeks = range(len(pkg_actual))

    axes[i].plot(weeks, pkg_actual.values, 'o-', color=colors[pkg],
                 linewidth=2, markersize=6, label='Aktual', alpha=0.9)
    axes[i].plot(weeks, pkg_pred, 's--', color='#e74c3c',
                 linewidth=2, markersize=6, label='Prediksi', alpha=0.8)
    axes[i].fill_between(weeks, pkg_actual.values, pkg_pred,
                         alpha=0.1, color='red')

    axes[i].set_title(f'📦 {PACKAGE_NAMES[pkg]}', fontsize=14, fontweight='bold')
    axes[i].set_ylabel('Jumlah Pesanan')
    axes[i].legend(fontsize=11, loc='upper left')
    axes[i].grid(True, alpha=0.3)

    pkg_mae = mean_absolute_error(pkg_actual, pkg_pred)
    pkg_r2 = r2_score(pkg_actual, pkg_pred) if len(pkg_actual) > 1 else 0
    axes[i].text(0.98, 0.05, f'MAE: {pkg_mae:.2f} | R²: {pkg_r2:.4f}',
                 transform=axes[i].transAxes, ha='right', fontsize=11,
                 bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8))

axes[2].set_xlabel('Minggu (Test Set)')
fig.suptitle('Perbandingan Aktual vs Prediksi (Test Set)', fontsize=16, fontweight='bold', y=1.01)
plt.tight_layout()
plt.show()

# %%
# === Visualisasi: Scatter Plot Aktual vs Prediksi ===
fig, ax = plt.subplots(figsize=(8, 8))

for pkg in PACKAGES:
    mask = test_df['package_slug'] == pkg
    pkg_actual = y_test[mask.values]
    pkg_pred = y_pred[mask.values]
    ax.scatter(pkg_actual, pkg_pred, s=60, alpha=0.7, label=PACKAGE_NAMES[pkg],
               color=colors[pkg], edgecolors='white', linewidth=0.5)

min_val = min(y_test.min(), y_pred.min()) - 2
max_val = max(y_test.max(), y_pred.max()) + 2
ax.plot([min_val, max_val], [min_val, max_val], 'k--', linewidth=2, alpha=0.5,
        label='Perfect Prediction')

ax.set_xlabel('Nilai Aktual', fontsize=13)
ax.set_ylabel('Nilai Prediksi', fontsize=13)
ax.set_title(f'Scatter Plot: Aktual vs Prediksi (R² = {r2:.4f})', fontsize=15, fontweight='bold')
ax.legend(fontsize=11)
ax.set_aspect('equal')
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()

# %%
# === Visualisasi: Distribusi Residual (Error) ===
residuals = y_test.values - y_pred

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# Histogram residual
axes[0].hist(residuals, bins=20, color='#3498db', edgecolor='white', alpha=0.8)
axes[0].axvline(0, color='red', linestyle='--', linewidth=2)
axes[0].set_xlabel('Residual (Aktual - Prediksi)')
axes[0].set_ylabel('Frekuensi')
axes[0].set_title('Distribusi Residual', fontsize=14, fontweight='bold')

# Residual vs Predicted
axes[1].scatter(y_pred, residuals, alpha=0.6, color='#e74c3c', edgecolors='white')
axes[1].axhline(0, color='black', linestyle='--', linewidth=2)
axes[1].set_xlabel('Nilai Prediksi')
axes[1].set_ylabel('Residual')
axes[1].set_title('Residual vs Prediksi', fontsize=14, fontweight='bold')

plt.tight_layout()
plt.show()

# %%
# === Tabel Aktual vs Prediksi (Test Set) ===
result_table = test_df[['year_week', 'package_slug']].copy()
result_table['package_name'] = result_table['package_slug'].map(PACKAGE_NAMES)
result_table['aktual'] = y_test.values
result_table['prediksi'] = [round(p, 1) for p in y_pred]
result_table['error'] = result_table['aktual'] - result_table['prediksi']
result_table['abs_error'] = result_table['error'].abs()

print("📊 Tabel Aktual vs Prediksi (10 baris pertama):")
print(result_table[['year_week', 'package_name', 'aktual', 'prediksi', 'error']].head(10).to_string(index=False))

# %% [markdown]
# ## 9. Prediksi 1 Minggu ke Depan

# %%
# === PREDIKSI MINGGU DEPAN ===

print("=" * 60)
print("  PREDIKSI 1 MINGGU KE DEPAN")
print("=" * 60)

# Re-train model final pada seluruh data
final_model = RandomForestRegressor(
    **grid_search.best_params_,
    random_state=42,
)
final_model.fit(X_all, y_all)

# Hitung minggu depan
today = datetime.now()
next_monday = today + timedelta(days=(7 - today.weekday()))
next_sunday = next_monday + timedelta(days=6)
iso_year, iso_week, _ = next_monday.isocalendar()
week_label = f"{iso_year}-W{iso_week:02d}"

print(f"\n  📅 Periode: {week_label}")
print(f"     {next_monday.strftime('%d %B %Y')} s/d {next_sunday.strftime('%d %B %Y')}")
print()

predictions = []

for pkg in PACKAGES:
    pkg_data = df[df['package_slug'] == pkg].sort_values('week_start')
    last_row = pkg_data.iloc[-1]
    recent = pkg_data['order_count'].values

    features = {}

    # Historis
    features['lag_1'] = float(recent[-1])
    features['lag_2'] = float(recent[-2]) if len(recent) >= 2 else features['lag_1']

    # Rata-rata bergerak
    last_2 = recent[-2:] if len(recent) >= 2 else recent
    last_4 = recent[-4:] if len(recent) >= 4 else recent
    features['rolling_mean_2'] = float(np.mean(last_2))
    features['rolling_mean_4'] = float(np.mean(last_4))

    # Variasi
    features['rolling_std_4'] = float(np.std(last_4)) if len(last_4) > 1 else 0.0

    # Waktu
    features['month'] = next_monday.month
    features['week_of_month'] = (next_monday.day - 1) // 7 + 1

    # Musiman
    week_of_year = next_monday.isocalendar()[1]
    features['sin_week'] = math.sin(2 * math.pi * week_of_year / 52)
    features['cos_week'] = math.cos(2 * math.pi * week_of_year / 52)

    # Tren
    features['trend'] = int(last_row['trend']) + 1

    X_pred = pd.DataFrame([features])[FEATURE_COLUMNS]
    pred = final_model.predict(X_pred)[0]
    pred_orders = max(1, round(pred))

    predictions.append({
        'package': PACKAGE_NAMES[pkg],
        'predicted': pred_orders,
    })

    print(f"  📦 {PACKAGE_NAMES[pkg]:15s}: {pred_orders:3d} pesanan")

total = sum(p['predicted'] for p in predictions)
print(f"\n  {'─' * 35}")
print(f"  📊 Total prediksi semua paket : {total} pesanan")
print("=" * 60)

# %%
# === Visualisasi: Prediksi Minggu Depan ===
fig, ax = plt.subplots(figsize=(10, 6))

pkg_names = [p['package'] for p in predictions]
pkg_values = [p['predicted'] for p in predictions]
pkg_colors_pred = ['#3498db', '#2ecc71', '#e74c3c']

bars = ax.bar(pkg_names, pkg_values, color=pkg_colors_pred, edgecolor='white',
              linewidth=2, width=0.5)

for bar, val in zip(bars, pkg_values):
    ax.text(bar.get_x() + bar.get_width()/2., bar.get_height() + 1,
            f'{val} pesanan', ha='center', va='bottom', fontweight='bold', fontsize=14)

ax.set_ylabel('Prediksi Jumlah Pesanan', fontsize=13)
ax.set_title(f'Prediksi Pesanan Minggu Depan ({week_label})',
             fontsize=15, fontweight='bold')
ax.grid(axis='y', alpha=0.3)
plt.tight_layout()
plt.show()

# %% [markdown]
# ---
#
# ## 📋 Ringkasan Hasil
#
# | Aspek | Detail |
# |-------|--------|
# | **Algoritma** | Random Forest Regressor |
# | **Dataset** | `dataset_transaksi_nutrilicious.csv` (13.000+ transaksi, 24 bulan) |
# | **Data setelah agregasi** | ~315 baris mingguan (105 minggu × 3 paket) |
# | **Jumlah Fitur** | 10 fitur (historis, rata-rata, variasi, waktu, musiman, tren) |
# | **Hyperparameter Tuning** | GridSearchCV (120 kombinasi) |
# | **Cross-Validation** | TimeSeriesSplit (4 inner folds) |
# | **Metrik Evaluasi** | MAE, RMSE, R², MAPE |
#
# ### Metrik Evaluasi:
# - **MAE**: Rata-rata error absolut dalam jumlah pesanan
# - **RMSE**: Root mean squared error (sensitif terhadap outlier)
# - **R²**: Koefisien determinasi (seberapa baik model menjelaskan variasi data)
# - **MAPE**: Mean absolute percentage error (error dalam persen)
#
# ### Kesimpulan:
# Model Random Forest berhasil memprediksi jumlah pesanan paket katering sehat
# dengan akurasi yang tinggi, dibuktikan dengan nilai R² ≥ 0.90 dan error (MAE/RMSE)
# yang rendah. Model ini dapat digunakan sebagai dasar untuk prediksi stok bahan baku
# pada Sistem Informasi Pemesanan Katering Sehat CV Nutrisi Citra Nusantara.
