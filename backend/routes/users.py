"""
API Routes untuk Pengguna (Users)
Menyimpan profil pengguna termasuk alamat + koordinat (lat/lng) dari Leaflet
Autentikasi menggunakan JWT (flask-jwt-extended)
"""

import re
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from db import get_db
from datetime import datetime, timezone, timedelta

users_bp = Blueprint('users', __name__)

ACTIVE_TRANSACTION_STATUSES = ['confirmed', 'processing', 'delivered']

# Alur route users:
# Setelah login, frontend memakai JWT untuk mengambil atau memperbarui profil.
# Route mengambil user_id dari token, lalu menyimpan data profil dan koordinat
# alamat ke collection users.


def validate_phone_wa(phone: str) -> str | None:
    """
    Validasi nomor telepon/WhatsApp Indonesia.
    Format yang diterima: 08xx, 628xx, +628xx (10-15 digit angka).
    Mengembalikan pesan error jika tidak valid, None jika valid.
    """
    if not phone or not phone.strip():
        return None  # Phone kosong diperbolehkan (opsional)

    cleaned = re.sub(r'[\s\-()]', '', phone)
    digits_only = cleaned.lstrip('+')

    if not digits_only.isdigit():
        return "Nomor telepon hanya boleh berisi angka."

    if not re.match(r'^(08|628)', digits_only):
        return "Nomor harus diawali 08 atau 628 (format Indonesia)."

    if len(digits_only) < 10 or len(digits_only) > 15:
        return "Nomor telepon harus 10-15 digit."

    return None


def serialize_datetime(value):
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def parse_datetime(value):
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError:
            return None
    return None


def get_customer_status(total_transactions, total_spent, last_order_at):
    last_order_at = parse_datetime(last_order_at)
    if total_transactions == 0:
        return 'new'
    if last_order_at:
        now = datetime.now(last_order_at.tzinfo) if getattr(last_order_at, 'tzinfo', None) else datetime.now()
        if now - last_order_at > timedelta(days=60):
            return 'inactive'
        if now - last_order_at <= timedelta(days=30):
            return 'active'
    if total_transactions >= 3 or total_spent >= 500000:
        return 'loyal'
    return 'regular'


def customer_status_label(status):
    labels = {
        'new': 'User Baru',
        'active': 'User Aktif',
        'loyal': 'User Loyal',
        'inactive': 'User Pasif',
        'regular': 'User Reguler',
    }
    return labels.get(status, status)


def get_paid_amount(txn):
    for key in ['paid_amount', 'pay_amount', 'total']:
        try:
            amount = int(txn.get(key, 0) or 0)
        except (TypeError, ValueError):
            amount = 0
        if amount > 0:
            return amount
    return 0


def serialize_transaction_summary(txn):
    return {
        'id': str(txn.get('_id', '')),
        'order_id': txn.get('order_id', ''),
        'status': txn.get('status', ''),
        'total': int(txn.get('total', 0) or 0),
        'paid_amount': get_paid_amount(txn),
        'created_at': serialize_datetime(txn.get('created_at')),
    }


@users_bp.route('/recap', methods=['GET'])
@jwt_required()
def get_users_recap():
    """Rekapitulasi pelanggan: profil user + ringkasan nilai belanja."""
    if get_jwt_identity() != 'admin':
        return jsonify({'error': 'Akses khusus admin.'}), 403

    db = get_db()

    query = {'role': {'$ne': 'admin'}}

    search = request.args.get('search', '').strip()
    if search:
        query['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'email': {'$regex': search, '$options': 'i'}},
            {'phone': {'$regex': search, '$options': 'i'}},
        ]

    verification = request.args.get('verification', 'all')
    if verification == 'verified':
        query['is_verified'] = True
    elif verification == 'unverified':
        query['is_verified'] = {'$ne': True}

    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    date_query = {}
    if start_date_str:
        try:
            date_query['$gte'] = datetime.strptime(start_date_str, '%Y-%m-%d').replace(hour=0, minute=0, second=0)
        except ValueError:
            pass
    if end_date_str:
        try:
            date_query['$lte'] = datetime.strptime(end_date_str, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
        except ValueError:
            pass
    if date_query:
        query['created_at'] = date_query

    sort = request.args.get('sort', 'spent_desc')
    filter_status = request.args.get('customer_status', 'all')
    no_limit = request.args.get('no_limit') == 'true'

    users = list(db['users'].find(query, {'password': 0, 'otp': 0, 'otp_expires': 0}))
    user_ids = [str(user['_id']) for user in users]
    object_id_map = {str(user['_id']): user['_id'] for user in users}

    transactions_by_user = {user_id: [] for user_id in user_ids}
    if user_ids:
        txn_query = {
            'status': {'$in': ACTIVE_TRANSACTION_STATUSES},
            '$or': [
                {'user_id': {'$in': user_ids}},
                {'user_id': {'$in': [object_id_map[user_id] for user_id in user_ids]}},
            ]
        }
        for txn in db['transactions'].find(txn_query).sort('created_at', -1):
            user_id = str(txn.get('user_id', ''))
            if user_id in transactions_by_user:
                transactions_by_user[user_id].append(txn)

    recap = []

    for user in users:
        user_id = str(user['_id'])
        user_transactions = transactions_by_user.get(user_id, [])
        total_transactions = len(user_transactions)
        total_spent = sum(get_paid_amount(txn) for txn in user_transactions)
        average_spent = int(total_spent / total_transactions) if total_transactions > 0 else 0
        last_order_at = user_transactions[0].get('created_at') if user_transactions else None

        package_counts = {}
        transaction_summaries = []
        for txn in user_transactions:
            transaction_summaries.append(serialize_transaction_summary(txn))
            for item in txn.get('items', []):
                package_name = item.get('package_name') or item.get('name') or item.get('package_slug') or 'Item tanpa nama'
                try:
                    quantity = int(item.get('quantity', 0) or 0)
                except (TypeError, ValueError):
                    quantity = 0
                package_counts[package_name] = package_counts.get(package_name, 0) + max(quantity, 1)

        favorite_package = ''
        if package_counts:
            favorite_package = sorted(package_counts.items(), key=lambda item: item[1], reverse=True)[0][0]

        customer_status = get_customer_status(total_transactions, total_spent, last_order_at)

        recap.append({
            'id': user_id,
            'name': user.get('name', ''),
            'email': user.get('email', ''),
            'phone': user.get('phone', ''),
            'address': user.get('address', ''),
            'is_verified': bool(user.get('is_verified', False)),
            'created_at': serialize_datetime(user.get('created_at')),
            'updated_at': serialize_datetime(user.get('updated_at')),
            'total_transactions': total_transactions,
            'total_spent': total_spent,
            'average_spent': average_spent,
            'last_order_at': serialize_datetime(last_order_at),
            'favorite_package': favorite_package,
            'customer_status': customer_status,
            'customer_status_label': customer_status_label(customer_status),
            'transactions': transaction_summaries[:10],
        })

    if filter_status != 'all':
        recap = [user for user in recap if user['customer_status'] == filter_status]

    total_spent_all = sum(user['total_spent'] for user in recap)
    total_transactions_all = sum(user['total_transactions'] for user in recap)
    users_with_transactions = sum(1 for user in recap if user['total_transactions'] > 0)

    reverse = sort not in ['spent_asc', 'transactions_asc', 'registered_asc']
    if sort in ['spent_desc', 'spent_asc']:
        recap.sort(key=lambda user: user['total_spent'], reverse=reverse)
    elif sort in ['transactions_desc', 'transactions_asc']:
        recap.sort(key=lambda user: user['total_transactions'], reverse=reverse)
    elif sort in ['registered_desc', 'registered_asc']:
        recap.sort(key=lambda user: user.get('created_at') or '', reverse=reverse)
    elif sort == 'last_order_desc':
        recap.sort(key=lambda user: user.get('last_order_at') or '', reverse=True)

    total = len(recap)
    if no_limit:
        page = 1
        limit = total
        total_pages = 1
        paged_recap = recap
    else:
        try:
            page = max(1, int(request.args.get('page', 1)))
        except (ValueError, TypeError):
            page = 1
        try:
            limit = min(100, max(1, int(request.args.get('limit', 15))))
        except (ValueError, TypeError):
            limit = 15
        total_pages = max(1, -(-total // limit))
        start = (page - 1) * limit
        paged_recap = recap[start:start + limit]

    stats = {
        'total_users': len(recap),
        'verified_users': sum(1 for user in recap if user.get('is_verified')),
        'unverified_users': sum(1 for user in recap if not user.get('is_verified')),
        'users_with_transactions': users_with_transactions,
        'users_without_transactions': max(0, len(recap) - users_with_transactions),
        'total_transactions': total_transactions_all,
        'total_spent': total_spent_all,
        'average_spent_per_user': int(total_spent_all / users_with_transactions) if users_with_transactions else 0,
    }

    return jsonify({
        'data': paged_recap,
        'stats': stats,
        'total': total,
        'page': page,
        'limit': limit,
        'total_pages': total_pages,
    }), 200


@users_bp.route('/me', methods=['GET'])
@jwt_required()
def get_my_profile():
    """Ambil profil user yang sedang login."""
    db = get_db()
    user_id = get_jwt_identity()

    try:
        # Password dan OTP tidak dikirim kembali ke frontend demi keamanan.
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

    # Validasi nomor telepon/WA
    phone_error = validate_phone_wa(phone)
    if phone_error:
        return jsonify({'error': phone_error}), 400

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
