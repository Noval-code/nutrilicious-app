"""
API Routes untuk Pengguna (Users)
Menyimpan profil pengguna termasuk alamat + koordinat (lat/lng) dari Leaflet
Autentikasi menggunakan JWT (flask-jwt-extended)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from db import get_db
from datetime import datetime, timezone

users_bp = Blueprint('users', __name__)


@users_bp.route('/me', methods=['GET'])
@jwt_required()
def get_my_profile():
    """Ambil profil user yang sedang login."""
    db = get_db()
    user_id = get_jwt_identity()

    try:
        user = db['users'].find_one({'_id': ObjectId(user_id)}, {'password': 0, 'otp': 0})
    except Exception:
        return jsonify({'error': 'User tidak ditemukan.'}), 404

    if not user:
        return jsonify({
            'id': user_id,
            'name': '',
            'phone': '',
            'address': '',
            'lat': None,
            'lng': None,
            'is_new': True
        })

    user['id'] = str(user.pop('_id'))
    # Tandai apakah user sudah punya alamat
    user['is_new'] = not bool(user.get('address') and user.get('lat') is not None)
    return jsonify(user), 200


@users_bp.route('/me', methods=['POST', 'PUT'])
@jwt_required()
def update_my_profile():
    """Simpan atau perbarui profil user yang sedang login."""
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json()

    name    = data.get('name', '')
    phone   = data.get('phone', '')
    address = data.get('address', '')
    lat     = data.get('lat', None)
    lng     = data.get('lng', None)

    now = datetime.now(timezone.utc)

    try:
        db['users'].update_one(
            {'_id': ObjectId(user_id)},
            {
                '$set': {
                    'name':       name,
                    'phone':      phone,
                    'address':    address,
                    'lat':        lat,
                    'lng':        lng,
                    'updated_at': now,
                }
            }
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    user = db['users'].find_one({'_id': ObjectId(user_id)}, {'password': 0, 'otp': 0})
    user['id'] = str(user.pop('_id'))
    return jsonify(user), 200
