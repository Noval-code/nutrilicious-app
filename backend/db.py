"""
MongoDB connection manager
"""

from pymongo import MongoClient, ASCENDING, DESCENDING
from config import Config

client = None
db = None


def _ensure_indexes(database):
    """Buat index untuk query yang sering dijalankan.
    create_index() bersifat idempotent — aman dipanggil berulang kali.
    """
    # Users: lookup by email (login, register)
    database['users'].create_index('email', unique=True)

    # Transactions: sering di-sort by created_at, filter by status/user
    database['transactions'].create_index([('created_at', DESCENDING)])
    database['transactions'].create_index('order_id', unique=True)
    database['transactions'].create_index('status')
    database['transactions'].create_index('user_id')

    # Menus & Materials: lookup by slug/name
    database['menus'].create_index('slug', unique=True, sparse=True)
    database['menu_categories'].create_index('slug', unique=True)
    database['payment_settings'].create_index('key', unique=True)
    database['materials'].create_index('name')


def get_db():
    """Get the MongoDB database instance"""
    global client, db
    if db is None:
        client = MongoClient(Config.MONGO_URI)
        db = client[Config.MONGO_DB_NAME]
        _ensure_indexes(db)
    return db


def close_db():
    """Close MongoDB connection"""
    global client, db
    if client:
        client.close()
        client = None
        db = None
