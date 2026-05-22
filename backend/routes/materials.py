"""
API Routes untuk Bahan Baku (Materials / Inventory)
"""

from flask import Blueprint, request, jsonify
from bson import ObjectId
from db import get_db

materials_bp = Blueprint('materials', __name__)


def serialize_material(material):
    """Convert MongoDB document to JSON-serializable dict"""
    material['_id'] = str(material['_id'])
    return material


@materials_bp.route('/', methods=['GET'])
def get_materials():
    """Get semua bahan baku, dengan optional search query"""
    db = get_db()
    search = request.args.get('search', '')
    
    query = {}
    if search:
        query['name'] = {'$regex': search, '$options': 'i'}
    
    materials = list(db['materials'].find(query))
    return jsonify([serialize_material(m) for m in materials])


@materials_bp.route('/<material_id>', methods=['GET'])
def get_material(material_id):
    """Get satu bahan baku berdasarkan ID"""
    db = get_db()
    material = db['materials'].find_one({'_id': ObjectId(material_id)})
    if not material:
        return jsonify({'error': 'Material not found'}), 404
    return jsonify(serialize_material(material))


@materials_bp.route('/', methods=['POST'])
def create_material():
    """Tambah bahan baku baru"""
    db = get_db()
    data = request.get_json()
    
    required_fields = ['name', 'unit', 'stock', 'min_stock']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Field "{field}" wajib diisi'}), 400
    
    material = {
        'name': data['name'],
        'unit': data['unit'],
        'stock': int(data['stock']),
        'min_stock': int(data['min_stock']),
    }
    
    result = db['materials'].insert_one(material)
    material['_id'] = str(result.inserted_id)
    
    return jsonify(material), 201


@materials_bp.route('/<material_id>', methods=['PUT'])
def update_material(material_id):
    """Update bahan baku"""
    db = get_db()
    data = request.get_json()
    
    update_data = {}
    for field in ['name', 'unit', 'stock', 'min_stock']:
        if field in data:
            if field in ['stock', 'min_stock']:
                update_data[field] = int(data[field])
            else:
                update_data[field] = data[field]
    
    if not update_data:
        return jsonify({'error': 'Tidak ada data untuk di-update'}), 400
    
    result = db['materials'].update_one(
        {'_id': ObjectId(material_id)},
        {'$set': update_data}
    )
    
    if result.matched_count == 0:
        return jsonify({'error': 'Material not found'}), 404
    
    updated = db['materials'].find_one({'_id': ObjectId(material_id)})
    return jsonify(serialize_material(updated))


@materials_bp.route('/<material_id>', methods=['DELETE'])
def delete_material(material_id):
    """Hapus bahan baku"""
    db = get_db()
    result = db['materials'].delete_one({'_id': ObjectId(material_id)})
    
    if result.deleted_count == 0:
        return jsonify({'error': 'Material not found'}), 404
    
    return jsonify({'message': 'Material berhasil dihapus'}), 200
