"""
API Routes untuk Log Pengiriman Paket Langganan
"""

from datetime import datetime, timedelta

from bson import ObjectId
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from db import get_db

delivery_logs_bp = Blueprint('delivery_logs', __name__)

DELIVERY_STATUS = ['pending', 'prepared', 'on_delivery', 'delivered', 'received', 'failed']


def parse_duration_days(duration):
    try:
        return max(1, int(''.join(filter(str.isdigit, str(duration)))))
    except (ValueError, TypeError):
        return 1


def parse_start_date(value):
    if not value:
        return datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    try:
        return datetime.strptime(value[:10], '%Y-%m-%d')
    except (ValueError, TypeError):
        return datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)


def serialize_log(log):
    log['_id'] = str(log['_id'])
    if isinstance(log.get('transaction_id'), ObjectId):
        log['transaction_id'] = str(log['transaction_id'])
    for field in ['delivery_date', 'created_at', 'updated_at', 'received_at']:
        if field in log and isinstance(log[field], datetime):
            log[field] = log[field].isoformat()
    return log


def generate_delivery_logs_for_transaction(db, transaction):
    """Buat log pengiriman harian untuk item paket langganan yang sudah confirmed."""
    txn_id = transaction.get('_id')
    if not txn_id:
        return {'created': 0}

    existing = db['delivery_logs'].count_documents({'transaction_id': txn_id})
    if existing > 0:
        return {'created': 0}

    start_date = parse_start_date(transaction.get('subscription_start_date'))
    now = datetime.now()
    logs = []

    for item in transaction.get('items', []):
        if item.get('type', 'package') != 'package':
            continue

        total_days = parse_duration_days(item.get('duration', ''))
        for day in range(1, total_days + 1):
            delivery_date = start_date + timedelta(days=day - 1)
            logs.append({
                'transaction_id': txn_id,
                'order_id': transaction.get('order_id', ''),
                'user_id': transaction.get('user_id', ''),
                'customer_name': transaction.get('customer_name', ''),
                'customer_phone': transaction.get('customer_phone', ''),
                'customer_address': transaction.get('customer_address', ''),
                'package_name': item.get('package_name', ''),
                'package_slug': item.get('package_slug', ''),
                'duration': item.get('duration', ''),
                'meal_type': item.get('meal_type', ''),
                'delivery_day': day,
                'total_days': total_days,
                'delivery_date': delivery_date,
                'status': 'pending',
                'recipient_status': 'pending',
                'receiver_name': '',
                'admin_note': '',
                'created_at': now,
                'updated_at': now,
            })

    if logs:
        db['delivery_logs'].insert_many(logs)

    return {'created': len(logs)}


@delivery_logs_bp.route('/', methods=['GET'])
def get_delivery_logs():
    db = get_db()
    query = {}

    transaction_id = request.args.get('transaction_id')
    if transaction_id:
        query['transaction_id'] = ObjectId(transaction_id)

    order_id = request.args.get('order_id')
    if order_id:
        query['order_id'] = order_id

    status = request.args.get('status')
    if status and status != 'all':
        query['status'] = status

    logs = list(db['delivery_logs'].find(query).sort([('delivery_date', 1), ('delivery_day', 1)]))
    return jsonify([serialize_log(log) for log in logs])


@delivery_logs_bp.route('/my-logs', methods=['GET'])
@jwt_required()
def get_my_delivery_logs():
    db = get_db()
    user_id = get_jwt_identity()
    query = {'user_id': user_id}

    order_id = request.args.get('order_id')
    if order_id:
        query['order_id'] = order_id

    logs = list(db['delivery_logs'].find(query).sort([('delivery_date', 1), ('delivery_day', 1)]))
    return jsonify([serialize_log(log) for log in logs])


@delivery_logs_bp.route('/<log_id>', methods=['PUT'])
def update_delivery_log(log_id):
    db = get_db()
    data = request.get_json() or {}
    update_data = {'updated_at': datetime.now()}

    if 'status' in data:
        status = data.get('status')
        if status not in DELIVERY_STATUS:
            return jsonify({'error': 'Status pengiriman tidak valid'}), 400
        update_data['status'] = status

    if 'admin_note' in data:
        update_data['admin_note'] = data.get('admin_note', '')

    if 'receiver_name' in data:
        update_data['receiver_name'] = data.get('receiver_name', '')

    db['delivery_logs'].update_one({'_id': ObjectId(log_id)}, {'$set': update_data})
    updated = db['delivery_logs'].find_one({'_id': ObjectId(log_id)})
    if not updated:
        return jsonify({'error': 'Log pengiriman tidak ditemukan'}), 404
    return jsonify(serialize_log(updated))


@delivery_logs_bp.route('/<log_id>/confirm-received', methods=['PUT'])
@jwt_required()
def confirm_received(log_id):
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    log = db['delivery_logs'].find_one({'_id': ObjectId(log_id), 'user_id': user_id})
    if not log:
        return jsonify({'error': 'Log pengiriman tidak ditemukan'}), 404

    now = datetime.now()
    update_data = {
        'status': 'received',
        'recipient_status': 'confirmed',
        'receiver_name': data.get('receiver_name', '') or log.get('customer_name', ''),
        'received_at': now,
        'updated_at': now,
    }
    db['delivery_logs'].update_one({'_id': ObjectId(log_id)}, {'$set': update_data})
    updated = db['delivery_logs'].find_one({'_id': ObjectId(log_id)})
    return jsonify(serialize_log(updated))
