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


def parse_delivery_date(value, fallback=None):
    if value:
        try:
            return datetime.strptime(str(value)[:10], '%Y-%m-%d')
        except (ValueError, TypeError):
            pass
    if isinstance(fallback, datetime):
        return fallback.replace(hour=0, minute=0, second=0, microsecond=0)
    return datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)


def menu_summary(menu):
    if not menu:
        return None
    return {
        'menu_id': str(menu.get('_id', '')),
        'title': menu.get('title', ''),
        'category': menu.get('category', ''),
        'items': menu.get('items', []),
        'image_url': menu.get('image_url', ''),
    }


def get_default_menus_for_day(db, package_slug, delivery_day, meal_type):
    schedule = db['menu_schedules'].find_one({'package_slug': package_slug}, sort=[('updated_at', -1)])
    if not schedule or not schedule.get('schedule'):
        return {}

    schedule_day = schedule['schedule'][(delivery_day - 1) % len(schedule['schedule'])]
    default_menus = {}

    if meal_type in ['Lunch', 'Lunch & Dinner'] and schedule_day.get('lunch_menu_id'):
        try:
            menu = db['menus'].find_one({'_id': ObjectId(schedule_day['lunch_menu_id'])})
            if menu:
                default_menus['lunch'] = menu_summary(menu)
        except Exception:
            pass

    if meal_type in ['Dinner', 'Lunch & Dinner'] and schedule_day.get('dinner_menu_id'):
        try:
            menu = db['menus'].find_one({'_id': ObjectId(schedule_day['dinner_menu_id'])})
            if menu:
                default_menus['dinner'] = menu_summary(menu)
        except Exception:
            pass

    return default_menus


def get_log_meal_type(db, log):
    if log.get('meal_type'):
        return log.get('meal_type')

    txn_id = log.get('transaction_id')
    if not txn_id:
        return ''

    transaction = db['transactions'].find_one({'_id': txn_id})
    if not transaction:
        return ''

    for item in transaction.get('items', []):
        if item.get('type', 'package') != 'package':
            continue
        same_slug = item.get('package_slug') and item.get('package_slug') == log.get('package_slug')
        same_name = item.get('package_name') and item.get('package_name') == log.get('package_name')
        if same_slug or same_name:
            return item.get('meal_type', '')
    return ''


def serialize_log(log):
    log['_id'] = str(log['_id'])
    if isinstance(log.get('transaction_id'), ObjectId):
        log['transaction_id'] = str(log['transaction_id'])
    for field in ['delivery_date', 'created_at', 'updated_at', 'received_at', 'delivered_at']:
        if field in log and isinstance(log[field], datetime):
            log[field] = log[field].isoformat()
    return log


def generate_delivery_logs_for_transaction(db, transaction):
    """Buat log pengiriman untuk paket langganan, menu satuan, dan pesanan acara."""
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
        item_type = item.get('type', 'package')
        base_log = {
            'transaction_id': txn_id,
            'order_id': transaction.get('order_id', ''),
            'user_id': transaction.get('user_id', ''),
            'customer_name': transaction.get('customer_name', ''),
            'customer_phone': transaction.get('customer_phone', ''),
            'customer_address': transaction.get('customer_address', ''),
            'status': 'pending',
            'recipient_status': 'pending',
            'receiver_name': '',
            'admin_note': '',
            'delivery_proof_url': '',
            'delivery_proof_public_id': '',
            'delivery_note': '',
            'delivered_at': None,
            'created_at': now,
            'updated_at': now,
        }

        if item_type == 'package':
            total_days = parse_duration_days(item.get('duration', ''))
            for day in range(1, total_days + 1):
                delivery_date = start_date + timedelta(days=day - 1)
                default_menus = get_default_menus_for_day(db, item.get('package_slug', ''), day, item.get('meal_type', ''))
                logs.append({
                    **base_log,
                    'delivery_type': 'subscription',
                    'item_name': item.get('package_name', '') or item.get('name', ''),
                    'package_name': item.get('package_name', ''),
                    'package_slug': item.get('package_slug', ''),
                    'duration': item.get('duration', ''),
                    'meal_type': item.get('meal_type', ''),
                    'default_menus': default_menus,
                    'custom_menus': {},
                    'delivery_day': day,
                    'total_days': total_days,
                    'delivery_date': delivery_date,
                })
            continue

        delivery_type = 'event' if item.get('order_type') == 'event' else 'single_menu'
        delivery_date = parse_delivery_date(item.get('event_date'), transaction.get('created_at'))
        logs.append({
            **base_log,
            'delivery_type': delivery_type,
            'item_name': item.get('name', '') or item.get('package_name', ''),
            'package_name': item.get('package_name', '') or item.get('name', ''),
            'package_slug': item.get('package_slug', '') or item.get('slug', ''),
            'category': item.get('category', ''),
            'order_type': item.get('order_type', ''),
            'event_date': item.get('event_date', ''),
            'event_time': item.get('event_time', ''),
            'duration': item.get('duration', ''),
            'meal_type': item.get('meal_type', ''),
            'default_menus': {},
            'custom_menus': {},
            'delivery_day': 1,
            'total_days': 1,
            'delivery_date': delivery_date,
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
        if status in ['delivered', 'received']:
            update_data['delivered_at'] = datetime.now()

    if 'admin_note' in data:
        update_data['admin_note'] = data.get('admin_note', '')

    if 'receiver_name' in data:
        update_data['receiver_name'] = data.get('receiver_name', '')

    if 'delivery_proof_url' in data:
        update_data['delivery_proof_url'] = data.get('delivery_proof_url', '')

    if 'delivery_proof_public_id' in data:
        update_data['delivery_proof_public_id'] = data.get('delivery_proof_public_id', '')

    if 'delivery_note' in data:
        update_data['delivery_note'] = data.get('delivery_note', '')

    if update_data.get('delivery_proof_url') and data.get('mark_delivered', True):
        update_data['status'] = 'delivered'
        update_data['delivered_at'] = datetime.now()

    db['delivery_logs'].update_one({'_id': ObjectId(log_id)}, {'$set': update_data})
    updated = db['delivery_logs'].find_one({'_id': ObjectId(log_id)})
    if not updated:
        return jsonify({'error': 'Log pengiriman tidak ditemukan'}), 404
    return jsonify(serialize_log(updated))


@delivery_logs_bp.route('/<log_id>/request-menu-change', methods=['PUT'])
@jwt_required()
def request_menu_change(log_id):
    db = get_db()
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    meal_slot = data.get('meal_slot', '')
    menu_id = data.get('menu_id', '')

    if meal_slot not in ['lunch', 'dinner']:
        return jsonify({'error': 'Pilihan waktu makan tidak valid'}), 400

    log = db['delivery_logs'].find_one({'_id': ObjectId(log_id), 'user_id': user_id})
    if not log:
        return jsonify({'error': 'Log pengiriman tidak ditemukan'}), 404

    if log.get('status') != 'pending':
        return jsonify({'error': 'Menu hanya bisa diganti sebelum pesanan diproses'}), 400

    meal_type = get_log_meal_type(db, log)
    allowed_slots = []
    if meal_type in ['Lunch', 'Lunch & Dinner']:
        allowed_slots.append('lunch')
    if meal_type in ['Dinner', 'Lunch & Dinner']:
        allowed_slots.append('dinner')
    if meal_slot not in allowed_slots:
        return jsonify({'error': 'Menu pengganti tidak sesuai tipe makan paket'}), 400

    try:
        menu = db['menus'].find_one({'_id': ObjectId(menu_id)})
    except Exception:
        menu = None
    if not menu:
        return jsonify({'error': 'Menu pengganti tidak ditemukan'}), 404

    expected_category = 'lunch' if meal_slot == 'lunch' else 'dinner'
    if menu.get('category') != expected_category:
        return jsonify({'error': 'Menu pengganti harus sesuai kategori waktu makan'}), 400

    default_menu = (log.get('default_menus') or {}).get(meal_slot)
    custom_menu = {
        **menu_summary(menu),
        'original_menu_id': (default_menu or {}).get('menu_id', ''),
        'original_menu_title': (default_menu or {}).get('title', ''),
        'requested_at': datetime.now().isoformat(),
    }

    db['delivery_logs'].update_one(
        {'_id': ObjectId(log_id)},
        {'$set': {
            f'custom_menus.{meal_slot}': custom_menu,
            'updated_at': datetime.now(),
        }}
    )
    updated = db['delivery_logs'].find_one({'_id': ObjectId(log_id)})
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
