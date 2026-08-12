"""
API Routes untuk Master Data Kategori Menu
"""

from datetime import datetime

from bson import ObjectId
from flask import Blueprint, jsonify, request

from db import get_db

menu_categories_bp = Blueprint('menu_categories', __name__)


DEFAULT_CATEGORIES = [
    {'name': 'Lunch', 'slug': 'lunch'},
    {'name': 'Dinner', 'slug': 'dinner'},
]


def slugify(value):
    return '-'.join(str(value or '').strip().lower().split())


def ensure_default_categories(db):
    now = datetime.now()
    for category in DEFAULT_CATEGORIES:
        db['menu_categories'].update_one(
            {'slug': category['slug']},
            {
                '$setOnInsert': {
                    'name': category['name'],
                    'slug': category['slug'],
                    'is_active': True,
                    'created_at': now,
                }
            },
            upsert=True,
        )


def serialize_category(category):
    category['_id'] = str(category['_id'])
    if 'created_at' in category and isinstance(category['created_at'], datetime):
        category['created_at'] = category['created_at'].isoformat()
    if 'updated_at' in category and isinstance(category['updated_at'], datetime):
        category['updated_at'] = category['updated_at'].isoformat()
    return category


@menu_categories_bp.route('/', methods=['GET'])
def get_categories():
    db = get_db()
    ensure_default_categories(db)

    query = {}
    if request.args.get('active_only', 'false') == 'true':
        query['is_active'] = True

    categories = list(db['menu_categories'].find(query).sort('name', 1))
    return jsonify([serialize_category(c) for c in categories])


@menu_categories_bp.route('/', methods=['POST'])
def create_category():
    db = get_db()
    data = request.get_json() or {}
    name = str(data.get('name', '')).strip()
    slug = slugify(data.get('slug') or name)

    if not name:
        return jsonify({'error': 'Nama kategori wajib diisi'}), 400
    if not slug:
        return jsonify({'error': 'Slug kategori tidak valid'}), 400
    if db['menu_categories'].find_one({'slug': slug}):
        return jsonify({'error': 'Kategori dengan nama tersebut sudah ada'}), 400

    now = datetime.now()
    category = {
        'name': name,
        'slug': slug,
        'is_active': bool(data.get('is_active', True)),
        'created_at': now,
        'updated_at': now,
    }
    result = db['menu_categories'].insert_one(category)
    category['_id'] = result.inserted_id
    return jsonify(serialize_category(category)), 201


@menu_categories_bp.route('/<category_id>', methods=['PUT'])
def update_category(category_id):
    db = get_db()
    data = request.get_json() or {}
    existing = db['menu_categories'].find_one({'_id': ObjectId(category_id)})
    if not existing:
        return jsonify({'error': 'Kategori tidak ditemukan'}), 404

    update_data = {'updated_at': datetime.now()}
    if 'name' in data:
        name = str(data.get('name', '')).strip()
        if not name:
            return jsonify({'error': 'Nama kategori wajib diisi'}), 400
        update_data['name'] = name
        new_slug = slugify(data.get('slug') or name)
        duplicate = db['menu_categories'].find_one({'slug': new_slug, '_id': {'$ne': ObjectId(category_id)}})
        if duplicate:
            return jsonify({'error': 'Kategori dengan nama tersebut sudah ada'}), 400

        old_slug = existing.get('slug')
        update_data['slug'] = new_slug
        if old_slug and old_slug != new_slug:
            db['menus'].update_many({'category': old_slug}, {'$set': {'category': new_slug}})

    if 'is_active' in data:
        update_data['is_active'] = bool(data.get('is_active'))

    db['menu_categories'].update_one({'_id': ObjectId(category_id)}, {'$set': update_data})
    updated = db['menu_categories'].find_one({'_id': ObjectId(category_id)})
    return jsonify(serialize_category(updated))


@menu_categories_bp.route('/<category_id>', methods=['DELETE'])
def delete_category(category_id):
    db = get_db()
    category = db['menu_categories'].find_one({'_id': ObjectId(category_id)})
    if not category:
        return jsonify({'error': 'Kategori tidak ditemukan'}), 404

    used_count = db['menus'].count_documents({'category': category.get('slug')})
    if used_count > 0:
        return jsonify({'error': 'Kategori masih digunakan oleh menu'}), 400

    db['menu_categories'].delete_one({'_id': ObjectId(category_id)})
    return jsonify({'message': 'Kategori berhasil dihapus'}), 200
