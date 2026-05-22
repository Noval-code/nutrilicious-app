"""
Konfigurasi aplikasi Flask dan koneksi MongoDB
"""

import os

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'nutrilicious-secret-key-2026')
    
    # MongoDB Configuration
    MONGO_URI = os.environ.get('MONGO_URI', 'mongodb+srv://novalaula486:x4vXkIMwxZCyQRkm@cluster0.7ovcl59.mongodb.net/?appName=Cluster0')
    MONGO_DB_NAME = os.environ.get('MONGO_DB_NAME', 'nutrilicious_db')
    
    # Gemini AI (untuk chatbot RAG)
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', 'AIzaSyC_CB55QuLTD93J15jFwwhwJv0EvnJ1qqo')

    # Xendit Payment Gateway (Sandbox)
    XENDIT_SECRET_KEY = os.environ.get('XENDIT_SECRET_KEY', 'xnd_development_ia0UaHdAOebJlxhfGUA5wkjz9iIhRHPs44hSldEht3Y2nJzHpR338sDZlew64q')
    XENDIT_WEBHOOK_TOKEN = os.environ.get('XENDIT_WEBHOOK_TOKEN', 'wG0uGXLQoA3o3QXP7E9gCHYVDYnCY5zKKNFvoYmXrzinMvgX')

    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'nutrilicious-jwt-super-secret-2026')
    JWT_ACCESS_TOKEN_EXPIRES_HOURS = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES_HOURS', 24))

    # Flask-Mail (SMTP) Configuration
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME', '')   # isi di .env backend
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', '')   # isi di .env backend
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', '')

    # Admin credentials (simple, stored in config)
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'nutrilicious2026')

    # CORS
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
    
    # Flask
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    HOST = os.environ.get('FLASK_HOST', '0.0.0.0')
    PORT = int(os.environ.get('FLASK_PORT', 5000))
