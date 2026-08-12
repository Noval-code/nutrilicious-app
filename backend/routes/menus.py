"""
API Routes untuk Menu
"""

from flask import Blueprint, request, jsonify
from bson import ObjectId
from db import get_db
from cloudinary_helper import delete_image

menus_bp = Blueprint('menus', __name__)

# Alur route menus:
# Frontend/admin mengelola katalog menu melalui CRUD, route menormalisasi data
# menu, menyimpan detail nutrisi dan bahan, serta membersihkan gambar lama
# dari Cloudinary ketika gambar menu diganti atau menu dihapus.


def serialize_menu(menu):
    """Convert MongoDB document to JSON-serializable dict"""
    menu['_id'] = str(menu['_id'])
    # Pastikan item_details selalu ada (backward-compatible)
    if 'item_details' not in menu:
        menu['item_details'] = [
            {'name': item, 'quantity': '', 'unit': 'gram'}
            for item in menu.get('items', [])
        ]
    # Set default values for nutrition if missing
    menu['calories'] = menu.get('calories', 0)
    menu['protein'] = menu.get('protein', 0)
    menu['carbs'] = menu.get('carbs', 0)
    menu['fat'] = menu.get('fat', 0)
    menu['sugar'] = menu.get('sugar', 0)
    menu['price'] = menu.get('price', 0)
    menu['is_orderable'] = menu.get('is_orderable', False)
    menu['is_available'] = menu.get('is_available', True)
    return menu


@menus_bp.route('/', methods=['GET'])
def get_menus():
    """Get semua menu, dengan optional filter kategori dan search"""
    db = get_db()
    
    search = request.args.get('search', '')
    category = request.args.get('category', '')
    orderable = request.args.get('orderable', '')
    available = request.args.get('available', '')
    
    query = {}
    if search:
        # Search menu berdasarkan judul dengan regex case-insensitive.
        query['title'] = {'$regex': search, '$options': 'i'}
    if category and category != 'all':
        # Filter kategori dipakai halaman katalog/admin untuk membatasi menu.
        query['category'] = category
    if orderable == 'true':
        query['is_orderable'] = True
    if available == 'true':
        query['is_available'] = True
    
    menus = list(db['menus'].find(query))
    return jsonify([serialize_menu(m) for m in menus])


@menus_bp.route('/<menu_id>', methods=['GET'])
def get_menu(menu_id):
    """Get satu menu berdasarkan ID"""
    db = get_db()
    menu = db['menus'].find_one({'_id': ObjectId(menu_id)})
    if not menu:
        return jsonify({'error': 'Menu not found'}), 404
    return jsonify(serialize_menu(menu))


@menus_bp.route('/', methods=['POST'])
def create_menu():
    """Tambah menu baru"""
    db = get_db()
    data = request.get_json()
    
    required_fields = ['title', 'category', 'items']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Field "{field}" wajib diisi'}), 400
    
    # Ambil item_details dari request, atau buat dari items
    item_details = data.get('item_details', [])
    if not item_details:
        item_details = [
            {'name': item, 'quantity': '', 'unit': 'gram'}
            for item in data['items']
        ]
    
    menu = {
        'title': data['title'],
        'category': data['category'],
        'items': data['items'],
        'item_details': item_details,
        'image_url': data.get('image_url', ''),
        'image_public_id': data.get('image_public_id', ''),
        'calories': data.get('calories', 0),
        'protein': data.get('protein', 0),
        'carbs': data.get('carbs', 0),
        'fat': data.get('fat', 0),
        'sugar': data.get('sugar', 0),
        'price': data.get('price', 0),
        'is_orderable': data.get('is_orderable', False),
        'is_available': data.get('is_available', True),
    }
    
    result = db['menus'].insert_one(menu)
    menu['_id'] = str(result.inserted_id)
    
    return jsonify(menu), 201


@menus_bp.route('/<menu_id>', methods=['PUT'])
def update_menu(menu_id):
    """Update menu"""
    db = get_db()
    data = request.get_json()
    
    update_data = {}
    for field in ['title', 'category', 'items', 'item_details', 'image_url', 'image_public_id', 'calories', 'protein', 'carbs', 'fat', 'sugar', 'price', 'is_orderable', 'is_available']:
        if field in data:
            update_data[field] = data[field]
    
    # Jika gambar diganti, hapus gambar lama dari Cloudinary
    if 'image_public_id' in data:
        # Hanya hapus gambar lama jika public_id berbeda dengan gambar baru.
        old_menu = db['menus'].find_one({'_id': ObjectId(menu_id)})
        if old_menu and old_menu.get('image_public_id') and old_menu['image_public_id'] != data.get('image_public_id', ''):
            delete_image(old_menu['image_public_id'])
    
    if not update_data:
        return jsonify({'error': 'Tidak ada data untuk di-update'}), 400
    
    result = db['menus'].update_one(
        {'_id': ObjectId(menu_id)},
        {'$set': update_data}
    )
    
    if result.matched_count == 0:
        return jsonify({'error': 'Menu not found'}), 404
    
    updated = db['menus'].find_one({'_id': ObjectId(menu_id)})
    return jsonify(serialize_menu(updated))


@menus_bp.route('/<menu_id>', methods=['DELETE'])
def delete_menu(menu_id):
    """Hapus menu"""
    db = get_db()
    
    # Hapus gambar dari Cloudinary jika ada
    menu = db['menus'].find_one({'_id': ObjectId(menu_id)})
    if menu and menu.get('image_public_id'):
        delete_image(menu['image_public_id'])
    
    result = db['menus'].delete_one({'_id': ObjectId(menu_id)})
    
    if result.deleted_count == 0:
        return jsonify({'error': 'Menu not found'}), 404
    
    return jsonify({'message': 'Menu berhasil dihapus'}), 200
