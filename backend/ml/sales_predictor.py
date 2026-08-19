"""
Sales Predictor - Random Forest
================================
Modul prediksi penjualan paket per minggu menggunakan Random Forest.

Fitur:
- Feature engineering dari data transaksi MongoDB
- Training dengan GridSearchCV untuk hyperparameter tuning
- Evaluasi: MAE, RMSE, R²
- Feature importance analysis
- Prediksi 1 minggu ke depan per paket

Author: Nutrilicious Team
"""

import os
import math
import warnings
from datetime import datetime, timedelta

from dotenv import load_dotenv
load_dotenv()

import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from db import get_db

warnings.filterwarnings('ignore')

# Path untuk menyimpan model
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'sales_model.joblib')

# Daftar paket
PACKAGES = ['low-carbs', 'healthy-food', 'muscle-gain']
PACKAGE_NAMES = {
    'low-carbs': 'Low Carbs',
    'healthy-food': 'Healthy Food',
    'muscle-gain': 'Muscle Gain',
}


# ============================================================
# 1. DATA PREPARATION
# ============================================================

def prepare_data():
    """
    Ambil data transaksi dari MongoDB dan agregasi menjadi
    jumlah pesanan per paket per minggu.

    Returns:
        pd.DataFrame: DataFrame dengan kolom:
            - year_week (str): '2025-W23'
            - week_start (datetime): tanggal awal minggu
            - package_slug (str): slug paket
            - order_count (int): jumlah pesanan
    """
    db = get_db()

    # Ambil semua transaksi sukses
    transactions = list(db['transactions'].find(
        {'status': {'$in': ['delivered', 'confirmed', 'processing']}},
        {'created_at': 1, 'items': 1, 'status': 1}
    ))

    if not transactions:
        return pd.DataFrame()

    # Flatten: satu baris per transaksi per paket
    rows = []
    for txn in transactions:
        created_at = txn.get('created_at')
        if not isinstance(created_at, datetime):
            continue

        for item in txn.get('items', []):
            package_slug = item.get('package_slug', '')
            if package_slug in PACKAGES:
                rows.append({
                    'date': created_at,
                    'package_slug': package_slug,
                })

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)

    # Tambah kolom week
    df['year'] = df['date'].dt.isocalendar().year.astype(int)
    df['week'] = df['date'].dt.isocalendar().week.astype(int)
    df['year_week'] = df['year'].astype(str) + '-W' + df['week'].astype(str).str.zfill(2)

    # Hitung week_start (Senin)
    df['week_start'] = df['date'].apply(
        lambda d: d - timedelta(days=d.weekday())
    )
    df['week_start'] = df['week_start'].dt.normalize()

    # Agregasi: jumlah pesanan per paket per minggu
    agg = df.groupby(['year_week', 'week_start', 'package_slug']).size().reset_index(name='order_count')
    agg = agg.sort_values(['week_start', 'package_slug']).reset_index(drop=True)

    return agg


# ============================================================
# 2. FEATURE ENGINEERING
# ============================================================

def create_features(df):
    """
    Buat fitur-fitur untuk model Random Forest.

    Input DataFrame harus punya kolom: week_start, package_slug, order_count

    Returns:
        pd.DataFrame: DataFrame dengan semua fitur + target (order_count)
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

    # Apakah awal bulan (minggu 1-2)
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
    # Index sekuensial per paket
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

    # Momentum (arah perubahan)
    df['lag_1_diff'] = df['lag_1'] - df['lag_2']

    # --- Fitur Interaksi ---
    # Trend x seasonal: menangkap bagaimana tren berinteraksi dengan pola musiman
    df['trend_x_sin_week'] = df['trend'] * df['sin_week']
    df['trend_x_cos_week'] = df['trend'] * df['cos_week']

    # Drop rows dengan NaN (dari lag)
    df = df.dropna().reset_index(drop=True)

    return df


# ============================================================
# 3. TRAINING
# ============================================================

# Fitur yang digunakan untuk training (10 fitur, 5 kategori)
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

# Label yang lebih readable untuk feature importance
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


def train_model():
    """
    Training model Random Forest dengan GridSearchCV.

    Returns:
        dict: {
            'mae': float,
            'rmse': float,
            'r2': float,
            'best_params': dict,
            'trained_at': str,
            'train_size': int,
            'test_size': int,
            'feature_importance': list
        }
    """
    # 1. Prepare data
    print("[1/6] Preparing data...")
    raw_data = prepare_data()
    if raw_data.empty:
        raise ValueError("Tidak ada data transaksi untuk training. Jalankan seed_transactions.py terlebih dahulu.")

    # 2. Feature engineering
    print("[2/6] Creating features...")
    df = create_features(raw_data)
    if df.empty or len(df) < 10:
        raise ValueError("Data terlalu sedikit setelah feature engineering.")

    print(f"      Total data points: {len(df)} rows")

    # 3. Split data menggunakan TimeSeriesSplit (lebih cocok untuk time series)
    print("[3/6] Splitting data dengan TimeSeriesSplit...")
    tscv = TimeSeriesSplit(n_splits=3)

    # Ambil semua fitur dan target
    X_all = df[FEATURE_COLUMNS]
    y_all = df['order_count']

    # Gunakan fold terakhir sebagai test set final
    train_idx, test_idx = list(tscv.split(X_all))[-1]
    X_train = X_all.iloc[train_idx]
    y_train = y_all.iloc[train_idx]
    X_test = X_all.iloc[test_idx]
    y_test = y_all.iloc[test_idx]
    train_df = df.iloc[train_idx]
    test_df = df.iloc[test_idx]

    print(f"      Train: {len(X_train)} rows, Test: {len(X_test)} rows")

    # 4. Training dengan GridSearchCV + TimeSeriesSplit CV
    print("[4/6] Training Random Forest + GridSearchCV (TimeSeriesSplit CV)...")
    param_grid = {
        'n_estimators': [80, 120],
        'max_depth': [8, 12],
        'min_samples_split': [2],
        'min_samples_leaf': [1, 2],
    }

    rf = RandomForestRegressor(random_state=42, n_jobs=1)

    # Gunakan TimeSeriesSplit juga untuk cross-validation dalam GridSearch
    tscv_inner = TimeSeriesSplit(n_splits=2)

    grid_search = GridSearchCV(
        estimator=rf,
        param_grid=param_grid,
        cv=tscv_inner,
        scoring='neg_mean_absolute_error',
        n_jobs=1,
        verbose=0,
    )

    grid_search.fit(X_train, y_train)
    best_model = grid_search.best_estimator_

    print(f"      Best params: {grid_search.best_params_}")
    print(f"      Best CV MAE: {-grid_search.best_score_:.4f}")

    # 5. Evaluasi pada test fold terakhir
    print("[5/6] Evaluating model...")
    y_pred = best_model.predict(X_test)

    mae = mean_absolute_error(y_test, y_pred)
    rmse = math.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    print(f"      MAE:  {mae:.4f}")
    print(f"      RMSE: {rmse:.4f}")
    print(f"      R²:   {r2:.4f}")

    # 6. Re-train pada SEMUA data dengan best params untuk model final
    print("[6/6] Re-training final model on all data...")
    final_model = RandomForestRegressor(
        **grid_search.best_params_,
        random_state=42,
        n_jobs=1,
    )
    final_model.fit(X_all, y_all)

    # Simpan model final (trained on all data)
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump({
        'model': final_model,
        'feature_columns': FEATURE_COLUMNS,
        'last_data': df,  # Simpan data terakhir untuk lag features
    }, MODEL_PATH)
    print(f"      Model saved to: {MODEL_PATH}")

    # Feature importance (dari final model)
    importances = final_model.feature_importances_
    feature_imp = []
    for feat, imp in sorted(zip(FEATURE_COLUMNS, importances), key=lambda x: -x[1]):
        feature_imp.append({
            'feature': feat,
            'label': FEATURE_LABELS.get(feat, feat),
            'importance': round(float(imp), 4),
            'importance_pct': round(float(imp) * 100, 2),
        })

    # Simpan metrik ke MongoDB
    trained_at = datetime.now()
    metrics = {
        'mae': round(float(mae), 4),
        'rmse': round(float(rmse), 4),
        'r2': round(float(r2), 4),
        'best_params': grid_search.best_params_,
        'trained_at': trained_at,
        'train_size': len(X_train),
        'test_size': len(X_test),
        'total_data': len(df),
        'feature_importance': feature_imp,
    }

    db = get_db()
    db['ml_metrics'].delete_many({})  # Hanya simpan yang terbaru
    db['ml_metrics'].insert_one(metrics.copy())

    # Simpan juga data aktual vs prediksi untuk chart
    test_results = test_df[['year_week', 'week_start', 'package_slug', 'order_count']].copy()
    test_results['predicted'] = [round(float(p), 1) for p in y_pred]
    
    db['ml_test_results'].delete_many({})
    db['ml_test_results'].insert_many(test_results.to_dict('records'))

    metrics['trained_at'] = trained_at.isoformat()
    return metrics


# ============================================================
# 4. EVALUASI
# ============================================================

def get_metrics():
    """
    Ambil metrik evaluasi terakhir dari MongoDB.

    Returns:
        dict atau None
    """
    db = get_db()
    metrics = db['ml_metrics'].find_one({}, {'_id': 0})
    if metrics and 'trained_at' in metrics:
        if isinstance(metrics['trained_at'], datetime):
            metrics['trained_at'] = metrics['trained_at'].isoformat()
    return metrics


# ============================================================
# 5. FEATURE IMPORTANCE
# ============================================================

def get_feature_importance():
    """
    Ambil feature importance dari metrik yang tersimpan.

    Returns:
        list of dict: [{'feature': str, 'label': str, 'importance': float, 'importance_pct': float}]
    """
    metrics = get_metrics()
    if metrics and 'feature_importance' in metrics:
        return metrics['feature_importance']
    return []


# ============================================================
# 6. PREDIKSI 1 MINGGU KE DEPAN
# ============================================================

def predict_next_week():
    """
    Prediksi jumlah pesanan untuk 1 minggu ke depan, per paket.

    Returns:
        dict: {
            'predictions': [{'package_slug': str, 'package_name': str, 'predicted_orders': int}],
            'week_label': str,
            'week_start': str,
            'week_end': str,
        }
    """
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            "Model belum di-train. Klik 'Train Model' terlebih dahulu."
        )

    # Load model dan data terakhir
    saved = joblib.load(MODEL_PATH)
    model = saved['model']
    last_data = saved['last_data']

    # Tentukan minggu depan
    today = datetime.now()
    next_monday = today + timedelta(days=(7 - today.weekday()))
    next_sunday = next_monday + timedelta(days=6)

    predictions = []

    for pkg in PACKAGES:
        # Ambil data terakhir untuk paket ini
        pkg_data = last_data[last_data['package_slug'] == pkg].copy()
        if pkg_data.empty:
            predictions.append({
                'package_slug': pkg,
                'package_name': PACKAGE_NAMES[pkg],
                'predicted_orders': 0,
            })
            continue

        pkg_data = pkg_data.sort_values('week_start')
        last_row = pkg_data.iloc[-1]

        # Buat fitur untuk minggu depan
        features = {}

        # Historis
        recent = pkg_data['order_count'].values
        features['lag_1'] = float(recent[-1]) if len(recent) >= 1 else 0
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

        # Prediksi
        X = pd.DataFrame([features])[FEATURE_COLUMNS]
        pred = model.predict(X)[0]

        predictions.append({
            'package_slug': pkg,
            'package_name': PACKAGE_NAMES[pkg],
            'predicted_orders': max(1, round(float(pred))),
        })

    # Format week label
    iso_year, iso_week, _ = next_monday.isocalendar()
    week_label = f"{iso_year}-W{iso_week:02d}"

    return {
        'predictions': predictions,
        'week_label': week_label,
        'week_start': next_monday.strftime('%Y-%m-%d'),
        'week_end': next_sunday.strftime('%Y-%m-%d'),
    }


# ============================================================
# 7. DATA HISTORIS
# ============================================================

def get_historical_data():
    """
    Ambil data historis pesanan per paket per minggu.

    Returns:
        list of dict: [{'week': str, 'week_start': str, 'package_slug': str, 
                         'package_name': str, 'order_count': int}]
    """
    raw_data = prepare_data()
    if raw_data.empty:
        return []

    result = []
    for _, row in raw_data.iterrows():
        result.append({
            'week': row['year_week'],
            'week_start': row['week_start'].strftime('%Y-%m-%d'),
            'package_slug': row['package_slug'],
            'package_name': PACKAGE_NAMES.get(row['package_slug'], row['package_slug']),
            'order_count': int(row['order_count']),
        })

    return result


def get_test_results():
    """
    Ambil data aktual vs prediksi dari test set.

    Returns:
        list of dict
    """
    db = get_db()
    results = list(db['ml_test_results'].find({}, {'_id': 0}))
    for r in results:
        if isinstance(r.get('week_start'), datetime):
            r['week_start'] = r['week_start'].strftime('%Y-%m-%d')
        r['package_name'] = PACKAGE_NAMES.get(r.get('package_slug', ''), '')
    return results


# ============================================================
# 9. PREDIKSI KEBUTUHAN BAHAN BAKU
# ============================================================

def get_material_forecast():
    """
    Hitung kebutuhan bahan baku berdasarkan prediksi pesanan per paket.

    Logika:
        1. Ambil prediksi pesanan per paket (predict_next_week)
        2. Untuk setiap paket, ambil jadwal menu 6 hari dari menu_schedules
        3. Untuk setiap hari, ambil item_details dari menu lunch & dinner (drinks EXCLUDED)
        4. Hitung: quantity bahan × (predicted_orders / 6) per hari
        5. Aggregate total kebutuhan per bahan per paket

    Returns:
        dict: {
            'week_label': str,
            'week_start': str,
            'week_end': str,
            'packages': [
                {
                    'package_slug': str,
                    'package_name': str,
                    'predicted_orders': int,
                    'orders_per_day': float,
                    'has_schedule': bool,
                    'daily_breakdown': [
                        {
                            'day_number': int,
                            'day_name': str,
                            'lunch_menu': str,
                            'dinner_menu': str,
                            'materials': [{'name': str, 'quantity': float, 'unit': str, 'meal_type': str}]
                        }
                    ],
                    'total_materials': [
                        {'name': str, 'total_quantity': float, 'unit': str}
                    ]
                }
            ]
        }
    """
    from bson import ObjectId

    # 1. Ambil prediksi minggu depan
    forecast = predict_next_week()
    predictions = {p['package_slug']: p for p in forecast['predictions']}

    db = get_db()
    materials_lookup = {}
    for material in db['materials'].find():
        name_key = str(material.get('name', '')).strip().lower()
        unit_key = str(material.get('unit', '')).strip().lower()
        if not name_key or not unit_key:
            continue
        materials_lookup[(name_key, unit_key)] = {
            'stock': float(material.get('stock', 0) or 0),
            'min_stock': float(material.get('min_stock', 0) or 0),
        }

    packages_result = []

    for pkg_slug in PACKAGES:
        pred = predictions.get(pkg_slug)
        if not pred:
            continue

        predicted_orders = pred['predicted_orders']
        # Pembagian per hari: total pesanan / 6 hari
        orders_per_day = predicted_orders / 6.0

        # 2. Ambil jadwal menu TERBARU untuk paket ini (sort by updated_at desc)
        #    Karena bisa ada duplikat schedule untuk slug yang sama,
        #    kita ambil yang paling baru.
        schedule_doc = db['menu_schedules'].find_one(
            {'package_slug': pkg_slug},
            sort=[('updated_at', -1)]
        )

        if not schedule_doc or 'schedule' not in schedule_doc:
            packages_result.append({
                'package_slug': pkg_slug,
                'package_name': PACKAGE_NAMES.get(pkg_slug, pkg_slug),
                'predicted_orders': predicted_orders,
                'orders_per_day': round(orders_per_day, 2),
                'has_schedule': False,
                'daily_breakdown': [],
                'total_materials': [],
            })
            continue

        daily_breakdown = []
        # Aggregator total bahan per paket: {(name_lower, unit): total_qty}
        total_agg = {}

        for day in schedule_doc['schedule']:
            day_materials = []
            day_info = {
                'day_number': day['day_number'],
                'day_name': day['day_name'],
                'lunch_menu': '',
                'dinner_menu': '',
                'materials': [],
            }

            # Process lunch & dinner only (NO drinks)
            for meal_type, menu_id_key in [('lunch', 'lunch_menu_id'), ('dinner', 'dinner_menu_id')]:
                menu_id = day.get(menu_id_key, '')
                if not menu_id:
                    continue

                try:
                    menu = db['menus'].find_one({'_id': ObjectId(menu_id)})
                except Exception:
                    continue

                if not menu:
                    continue

                # Set menu name
                menu_title = menu.get('title', 'Unknown')
                if meal_type == 'lunch':
                    day_info['lunch_menu'] = menu_title
                else:
                    day_info['dinner_menu'] = menu_title

                # Get item_details
                item_details = menu.get('item_details', [])
                if not item_details:
                    # Fallback: generate from items (tanpa quantity)
                    item_details = [
                        {'name': item, 'quantity': '', 'unit': 'gram'}
                        for item in menu.get('items', [])
                    ]

                for item in item_details:
                    name = item.get('name', '').strip()
                    if not name:
                        continue

                    raw_qty = item.get('quantity', '')
                    try:
                        qty_per_portion = float(raw_qty)
                    except (ValueError, TypeError):
                        qty_per_portion = 0

                    unit = item.get('unit', 'gram').strip()

                    # Kebutuhan untuk hari ini = qty per porsi × orders per hari
                    daily_need = round(qty_per_portion * orders_per_day, 2)

                    day_materials.append({
                        'name': name,
                        'quantity': daily_need,
                        'unit': unit,
                        'meal_type': meal_type,
                    })

                    # Aggregate ke total per paket
                    agg_key = (name.lower(), unit.lower())
                    if agg_key not in total_agg:
                        total_agg[agg_key] = {
                            'name': name,
                            'total_quantity': 0,
                            'unit': unit,
                        }
                    total_agg[agg_key]['total_quantity'] += daily_need

            day_info['materials'] = day_materials
            daily_breakdown.append(day_info)

        # Round total quantities
        total_materials = []
        for key, value in total_agg.items():
            total_quantity = round(value['total_quantity'], 2)
            stock_data = materials_lookup.get(key)

            if stock_data is None:
                current_stock = 0
                min_stock = 0
                stock_gap = -total_quantity
                recommended_restock = total_quantity
                stock_status = 'unknown'
            else:
                current_stock = round(stock_data['stock'], 2)
                min_stock = round(stock_data['min_stock'], 2)
                stock_gap = round(current_stock - total_quantity, 2)
                recommended_restock = round(max(0, total_quantity - current_stock), 2)
                remaining_after_prediction = current_stock - total_quantity

                if recommended_restock > 0:
                    stock_status = 'restock'
                elif remaining_after_prediction < min_stock:
                    stock_status = 'low'
                else:
                    stock_status = 'safe'

            total_materials.append({
                'name': value['name'],
                'total_quantity': total_quantity,
                'unit': value['unit'],
                'current_stock': current_stock,
                'min_stock': min_stock,
                'stock_gap': stock_gap,
                'recommended_restock': recommended_restock,
                'stock_status': stock_status,
            })

        total_materials = sorted(total_materials, key=lambda x: (x['stock_status'] == 'safe', -x['recommended_restock'], -x['total_quantity']))

        packages_result.append({
            'package_slug': pkg_slug,
            'package_name': PACKAGE_NAMES.get(pkg_slug, pkg_slug),
            'predicted_orders': predicted_orders,
            'orders_per_day': round(orders_per_day, 2),
            'has_schedule': True,
            'daily_breakdown': daily_breakdown,
            'total_materials': total_materials,
        })

    return {
        'week_label': forecast['week_label'],
        'week_start': forecast['week_start'],
        'week_end': forecast['week_end'],
        'packages': packages_result,
    }


# ============================================================
# CLI: Jalankan langsung untuk test
# ============================================================

if __name__ == '__main__':
    print("=" * 55)
    print("  TRAINING MODEL PREDIKSI PENJUALAN")
    print("  Algoritma: Random Forest")
    print("=" * 55)
    print()

    try:
        result = train_model()
        print()
        print("=" * 55)
        print("  HASIL TRAINING")
        print(f"  MAE:  {result['mae']}")
        print(f"  RMSE: {result['rmse']}")
        print(f"  R²:   {result['r2']}")
        print()
        print("  TOP 5 FEATURE IMPORTANCE:")
        for i, fi in enumerate(result['feature_importance'][:5], 1):
            print(f"  {i}. {fi['label']}: {fi['importance_pct']}%")
        print("=" * 55)

        print()
        print("  PREDIKSI MINGGU DEPAN:")
        forecast = predict_next_week()
        print(f"  Periode: {forecast['week_label']} ({forecast['week_start']} s/d {forecast['week_end']})")
        for p in forecast['predictions']:
            print(f"  - {p['package_name']}: {p['predicted_orders']} pesanan")
        print("=" * 55)

    except Exception as e:
        print(f"[ERROR] {e}")
