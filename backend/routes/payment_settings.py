"""
API Routes untuk Pengaturan Pembayaran
"""

from datetime import datetime

from flask import Blueprint, jsonify, request

from db import get_db

payment_settings_bp = Blueprint('payment_settings', __name__)

DEFAULT_SETTINGS = {
    'key': 'default',
    'dp_enabled': True,
    'package_dp_percentage': 50,
    'event_dp_percentage': 30,
}


def normalize_percentage(value, field_name):
    try:
        percentage = int(value)
    except (TypeError, ValueError):
        raise ValueError(f'{field_name} harus berupa angka')

    if percentage < 1 or percentage > 99:
        raise ValueError(f'{field_name} harus antara 1 sampai 99')
    return percentage


def serialize_settings(settings):
    settings['_id'] = str(settings['_id'])
    if 'created_at' in settings and isinstance(settings['created_at'], datetime):
        settings['created_at'] = settings['created_at'].isoformat()
    if 'updated_at' in settings and isinstance(settings['updated_at'], datetime):
        settings['updated_at'] = settings['updated_at'].isoformat()
    return settings


def ensure_default_settings(db):
    now = datetime.now()
    db['payment_settings'].update_one(
        {'key': 'default'},
        {
            '$setOnInsert': {
                **DEFAULT_SETTINGS,
                'created_at': now,
                'updated_at': now,
            }
        },
        upsert=True,
    )
    return db['payment_settings'].find_one({'key': 'default'})


@payment_settings_bp.route('/', methods=['GET'])
def get_payment_settings():
    db = get_db()
    settings = ensure_default_settings(db)
    return jsonify(serialize_settings(settings))


@payment_settings_bp.route('/', methods=['PUT'])
def update_payment_settings():
    db = get_db()
    data = request.get_json() or {}

    update_data = {'updated_at': datetime.now()}
    if 'dp_enabled' in data:
        update_data['dp_enabled'] = bool(data.get('dp_enabled'))

    try:
        if 'package_dp_percentage' in data:
            update_data['package_dp_percentage'] = normalize_percentage(data.get('package_dp_percentage'), 'DP paket langganan')
        if 'event_dp_percentage' in data:
            update_data['event_dp_percentage'] = normalize_percentage(data.get('event_dp_percentage'), 'DP pesanan acara')
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400

    ensure_default_settings(db)
    db['payment_settings'].update_one({'key': 'default'}, {'$set': update_data})
    settings = db['payment_settings'].find_one({'key': 'default'})
    return jsonify(serialize_settings(settings))
