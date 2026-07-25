"""
API Routes untuk Menu Scheduling (Jadwal Menu per Paket)

Setiap paket punya 1 schedule 6 hari (Senin-Sabtu) sebagai BASE template.
Durasi lain diturunkan:
  - 5 Hari → Day 1-5
  - 6 Hari → Day 1-6 (full)
  - 10 Hari → Day 1-6 + repeat Day 1-4
  - 30 Hari → Day 1-6 × 5 siklus
"""

from flask import Blueprint, request, jsonify
from bson import ObjectId
from db import get_db
from datetime import datetime

schedules_bp = Blueprint('schedules', __name__)

DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']


def serialize_schedule(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    doc['_id'] = str(doc['_id'])
    if 'package_id' in doc and isinstance(doc['package_id'], ObjectId):
        doc['package_id'] = str(doc['package_id'])
    if 'updated_at' in doc and isinstance(doc['updated_at'], datetime):
        doc['updated_at'] = doc['updated_at'].isoformat()
    if 'created_at' in doc and isinstance(doc['created_at'], datetime):
        doc['created_at'] = doc['created_at'].isoformat()
    return doc


def populate_menu_details(db, schedule_doc):
    """Populate menu details (title, items, image, nutrition) into schedule entries"""
    if 'schedule' not in schedule_doc:
        return schedule_doc

    for day in schedule_doc['schedule']:
        # Populate lunch menu
        if day.get('lunch_menu_id'):
            try:
                menu = db['menus'].find_one({'_id': ObjectId(day['lunch_menu_id'])})
                if menu:
                    day['lunch_menu'] = {
                        '_id': str(menu['_id']),
                        'title': menu.get('title', ''),
                        'items': menu.get('items', []),
                        'image_url': menu.get('image_url', ''),
                        'calories': menu.get('calories', 0),
                        'protein': menu.get('protein', 0),
                        'carbs': menu.get('carbs', 0),
                        'fat': menu.get('fat', 0),
                        'sugar': menu.get('sugar', 0),
                    }
            except Exception:
                pass

        # Populate dinner menu
        if day.get('dinner_menu_id'):
            try:
                menu = db['menus'].find_one({'_id': ObjectId(day['dinner_menu_id'])})
                if menu:
                    day['dinner_menu'] = {
                        '_id': str(menu['_id']),
                        'title': menu.get('title', ''),
                        'items': menu.get('items', []),
                        'image_url': menu.get('image_url', ''),
                        'calories': menu.get('calories', 0),
                        'protein': menu.get('protein', 0),
                        'carbs': menu.get('carbs', 0),
                        'fat': menu.get('fat', 0),
                        'sugar': menu.get('sugar', 0),
                    }
            except Exception:
                pass

    return schedule_doc


@schedules_bp.route('/', methods=['GET'])
def get_all_schedules():
    """Get semua jadwal menu (untuk overview page)"""
    db = get_db()
    schedules = list(db['menu_schedules'].find())

    populate_details = request.args.get('populate', 'false') == 'true'

    result = []
    for s in schedules:
        if populate_details:
            s = populate_menu_details(db, s)
        result.append(serialize_schedule(s))

    return jsonify(result)


@schedules_bp.route('/<package_id>', methods=['GET'])
def get_schedule(package_id):
    """Get jadwal menu untuk paket tertentu"""
    db = get_db()

    schedule = db['menu_schedules'].find_one({'package_id': ObjectId(package_id)})
    if not schedule:
        # Return empty schedule template
        return jsonify({
            'package_id': package_id,
            'schedule': [
                {
                    'day_number': i + 1,
                    'day_name': DAY_NAMES[i],
                    'lunch_menu_id': '',
                    'dinner_menu_id': '',
                }
                for i in range(6)
            ],
            'is_empty': True,
        })

    populate_details = request.args.get('populate', 'false') == 'true'
    if populate_details:
        schedule = populate_menu_details(db, schedule)

    return jsonify(serialize_schedule(schedule))


@schedules_bp.route('/<package_id>', methods=['PUT'])
def save_schedule(package_id):
    """Simpan/update jadwal menu untuk paket (upsert)"""
    db = get_db()
    data = request.get_json()

    # Validate package exists
    pkg = db['packages'].find_one({'_id': ObjectId(package_id)})
    if not pkg:
        return jsonify({'error': 'Paket tidak ditemukan'}), 404

    # Validate schedule data
    schedule_data = data.get('schedule', [])
    if not isinstance(schedule_data, list) or len(schedule_data) != 6:
        return jsonify({'error': 'Schedule harus berisi 6 hari (Senin-Sabtu)'}), 400

    # Build clean schedule entries
    clean_schedule = []
    for i, day in enumerate(schedule_data):
        clean_schedule.append({
            'day_number': i + 1,
            'day_name': DAY_NAMES[i],
            'lunch_menu_id': day.get('lunch_menu_id', ''),
            'dinner_menu_id': day.get('dinner_menu_id', ''),
        })

    now = datetime.now()

    # Upsert: update if exists, insert if not
    result = db['menu_schedules'].update_one(
        {'package_id': ObjectId(package_id)},
        {
            '$set': {
                'package_id': ObjectId(package_id),
                'package_slug': pkg.get('slug', ''),
                'package_name': pkg.get('name', ''),
                'schedule': clean_schedule,
                'updated_at': now,
            },
            '$setOnInsert': {
                'created_at': now,
            }
        },
        upsert=True,
    )

    # Fetch updated document
    updated = db['menu_schedules'].find_one({'package_id': ObjectId(package_id)})
    updated = populate_menu_details(db, updated)

    return jsonify(serialize_schedule(updated))


@schedules_bp.route('/<package_id>', methods=['DELETE'])
def delete_schedule(package_id):
    """Hapus jadwal menu untuk paket"""
    db = get_db()
    result = db['menu_schedules'].delete_one({'package_id': ObjectId(package_id)})

    if result.deleted_count == 0:
        return jsonify({'error': 'Schedule tidak ditemukan'}), 404

    return jsonify({'message': 'Jadwal menu berhasil dihapus'}), 200


@schedules_bp.route('/by-slug/<package_slug>', methods=['GET'])
def get_schedule_by_slug(package_slug):
    """Get jadwal menu berdasarkan slug paket (untuk frontend user)"""
    db = get_db()

    schedule = db['menu_schedules'].find_one(
        {'package_slug': package_slug},
        sort=[('updated_at', -1)]
    )
    if not schedule:
        return jsonify({'error': 'Jadwal belum di-set untuk paket ini'}), 404

    schedule = populate_menu_details(db, schedule)
    return jsonify(serialize_schedule(schedule))
