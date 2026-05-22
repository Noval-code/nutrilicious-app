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
    """Get dashboard statistics"""
    db = get_db()
    stats = list(db['dashboard_stats'].find())
    return jsonify([serialize_doc(s) for s in stats])


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
