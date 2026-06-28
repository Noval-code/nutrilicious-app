"""
API Routes untuk Prediksi Penjualan (Random Forest)
Endpoints:
    POST /api/prediction/train            - Training model
    GET  /api/prediction/forecast         - Prediksi 1 minggu ke depan
    GET  /api/prediction/accuracy         - Metrik evaluasi
    GET  /api/prediction/feature-importance - Feature importance
    GET  /api/prediction/history          - Data historis mingguan
    GET  /api/prediction/test-results     - Aktual vs prediksi (test set)
"""

from flask import Blueprint, jsonify

prediction_bp = Blueprint('prediction', __name__)


@prediction_bp.route('/train', methods=['POST'])
def train():
    """Training model Random Forest dengan data transaksi terbaru."""
    try:
        from ml.sales_predictor import train_model
        result = train_model()
        return jsonify({
            'message': 'Model berhasil di-training!',
            'metrics': {
                'mae': result['mae'],
                'rmse': result['rmse'],
                'r2': result['r2'],
            },
            'best_params': result['best_params'],
            'trained_at': result['trained_at'],
            'train_size': result['train_size'],
            'test_size': result['test_size'],
            'feature_importance': result['feature_importance'],
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"[ERROR] Training failed: {e}")
        return jsonify({'error': f'Training gagal: {str(e)}'}), 500


@prediction_bp.route('/forecast', methods=['GET'])
def forecast():
    """Prediksi jumlah pesanan 1 minggu ke depan per paket."""
    try:
        from ml.sales_predictor import predict_next_week
        result = predict_next_week()
        return jsonify(result), 200
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        print(f"[ERROR] Forecast failed: {e}")
        return jsonify({'error': f'Prediksi gagal: {str(e)}'}), 500


@prediction_bp.route('/accuracy', methods=['GET'])
def accuracy():
    """Get metrik evaluasi model terakhir (MAE, RMSE, R²)."""
    try:
        from ml.sales_predictor import get_metrics
        metrics = get_metrics()
        if not metrics:
            return jsonify({'error': 'Model belum di-train.'}), 404
        return jsonify(metrics), 200
    except Exception as e:
        print(f"[ERROR] Get accuracy failed: {e}")
        return jsonify({'error': str(e)}), 500


@prediction_bp.route('/feature-importance', methods=['GET'])
def feature_importance():
    """Get feature importance dari model yang sudah di-train."""
    try:
        from ml.sales_predictor import get_feature_importance
        features = get_feature_importance()
        if not features:
            return jsonify({'error': 'Model belum di-train.'}), 404
        return jsonify({'features': features}), 200
    except Exception as e:
        print(f"[ERROR] Get feature importance failed: {e}")
        return jsonify({'error': str(e)}), 500


@prediction_bp.route('/history', methods=['GET'])
def history():
    """Get data historis pesanan per paket per minggu."""
    try:
        from ml.sales_predictor import get_historical_data
        data = get_historical_data()
        return jsonify({'data': data}), 200
    except Exception as e:
        print(f"[ERROR] Get history failed: {e}")
        return jsonify({'error': str(e)}), 500


@prediction_bp.route('/test-results', methods=['GET'])
def test_results():
    """Get data aktual vs prediksi dari test set."""
    try:
        from ml.sales_predictor import get_test_results
        data = get_test_results()
        return jsonify({'data': data}), 200
    except Exception as e:
        print(f"[ERROR] Get test results failed: {e}")
        return jsonify({'error': str(e)}), 500


@prediction_bp.route('/material-forecast', methods=['GET'])
def material_forecast():
    """Prediksi kebutuhan bahan baku berdasarkan prediksi pesanan per paket.
    
    Menghitung kebutuhan bahan baku dari:
    - Hasil prediksi pesanan per paket (minggu depan)
    - Jadwal menu 6 hari per paket (lunch & dinner, tanpa drinks)
    - Detail bahan (item_details) dari setiap menu
    
    Formula: quantity_per_porsi × (predicted_orders / 6) per hari
    """
    try:
        from ml.sales_predictor import get_material_forecast
        result = get_material_forecast()
        return jsonify(result), 200
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        print(f"[ERROR] Material forecast failed: {e}")
        return jsonify({'error': f'Prediksi bahan baku gagal: {str(e)}'}), 500

