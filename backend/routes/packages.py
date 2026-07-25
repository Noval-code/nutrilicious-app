"""
API Routes untuk Paket Langganan (Subscription Packages)
"""

from flask import Blueprint, request, jsonify
from bson import ObjectId
from db import get_db

packages_bp = Blueprint('packages', __name__)


def serialize_package(pkg):
    """Convert MongoDB document to JSON-serializable dict"""
    pkg['_id'] = str(pkg['_id'])
    return pkg


@packages_bp.route('/', methods=['GET'])
def get_packages():
    """Get semua paket langganan"""
    db = get_db()
    packages = list(db['packages'].find())
    return jsonify([serialize_package(p) for p in packages])


@packages_bp.route('/<package_id>', methods=['GET'])
def get_package(package_id):
    """Get satu paket berdasarkan ID"""
    db = get_db()
    pkg = db['packages'].find_one({'_id': ObjectId(package_id)})
    if not pkg:
        return jsonify({'error': 'Package not found'}), 404
    return jsonify(serialize_package(pkg))


@packages_bp.route('/', methods=['POST'])
def create_package():
    """Tambah paket baru"""
    db = get_db()
    data = request.get_json()
    
    required_fields = ['category', 'description', 'pricing']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Field "{field}" wajib diisi'}), 400
    
    pkg = {
        'slug': data.get('slug', data['category'].lower().replace(' ', '-')),
        'category': data['category'],
        'description': data['description'],
        'pricing': data['pricing'],
    }
    
    result = db['packages'].insert_one(pkg)
    pkg['_id'] = str(result.inserted_id)
    
    return jsonify(pkg), 201


@packages_bp.route('/<package_id>', methods=['PUT'])
def update_package(package_id):
    """Update paket"""
    db = get_db()
    data = request.get_json()
    
    update_data = {}
    for field in ['slug', 'category', 'description', 'pricing']:
        if field in data:
            update_data[field] = data[field]
    
    if not update_data:
        return jsonify({'error': 'Tidak ada data untuk di-update'}), 400
    
    result = db['packages'].update_one(
        {'_id': ObjectId(package_id)},
        {'$set': update_data}
    )
    
    if result.matched_count == 0:
        return jsonify({'error': 'Package not found'}), 404
    
    updated = db['packages'].find_one({'_id': ObjectId(package_id)})
    return jsonify(serialize_package(updated))


@packages_bp.route('/<package_id>', methods=['DELETE'])
def delete_package(package_id):
    """Hapus paket"""
    db = get_db()
    result = db['packages'].delete_one({'_id': ObjectId(package_id)})
    
    if result.deleted_count == 0:
        return jsonify({'error': 'Package not found'}), 404
    
    return jsonify({'message': 'Paket berhasil dihapus'}), 200
