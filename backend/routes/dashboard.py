"""
API Routes untuk Dashboard (Stats, Popular Menus, Featured Menus)
"""

from flask import Blueprint, jsonify
from db import get_db

dashboard_bp = Blueprint('dashboard', __name__)


def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    doc['_id'] = str(doc['_id'])
    return doc


@dashboard_bp.route('/stats', methods=['GET'])
def get_stats():
    """Get dashboard statistics dynamically from database counts"""
    db = get_db()
    
    # 1. Total Aktif Pelanggan (pure count of registered non-admin users)
    total_customers = db['users'].count_documents({'role': {'$ne': 'admin'}})
        
    # 2. Katalog Menu Aktif (pure count of menus)
    menu_count = db['menus'].count_documents({})
        
    # 3. Jenis Paket Berlangganan (pure count of packages)
    package_count = db['packages'].count_documents({})
        
    # 4. Macam Bahan Baku (pure count of materials)
    material_count = db['materials'].count_documents({})
        
    # Load stored stats to preserve custom metadata changes/trends/icons if seeded
    stored_stats = {}
    try:
        for s in db['dashboard_stats'].find():
            stored_stats[s.get('name')] = s
    except Exception:
        pass
        
    def get_stat_data(name, current_val, default_change, default_trend, default_icon):
        stored = stored_stats.get(name, {})
        return {
            'name': name,
            'value': str(current_val),
            'icon': stored.get('icon', default_icon),
            'change': stored.get('change', default_change),
            'trend': stored.get('trend', default_trend)
        }
        
    response_stats = [
        get_stat_data('Total Aktif Pelanggan', total_customers, '0%', 'neutral', 'Users'),
        get_stat_data('Katalog Menu Aktif', menu_count, '0', 'neutral', 'Utensils'),
        get_stat_data('Jenis Paket Berlangganan', package_count, '0', 'neutral', 'Package'),
        get_stat_data('Macam Bahan Baku', material_count, '0%', 'neutral', 'Beef')
    ]
    
    return jsonify(response_stats)


@dashboard_bp.route('/popular-menus', methods=['GET'])
def get_popular_menus():
    """Get menu terpopuler"""
    db = get_db()
    popular = list(db['popular_menus'].find().sort('orders', -1))
    return jsonify([serialize_doc(p) for p in popular])


@dashboard_bp.route('/featured-menus', methods=['GET'])
def get_featured_menus():
    """Get featured / menu andalan"""
    db = get_db()
    featured = list(db['featured_menus'].find())
    return jsonify([serialize_doc(f) for f in featured])
