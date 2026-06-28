"""
Konfigurasi aplikasi Flask dan koneksi MongoDB

PENTING: Jangan hardcode API keys / password di sini!
         Semua credential harus diisi via file .env
"""

import os

class Config:
    """Base configuration — semua secret dibaca dari environment variables"""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-change-me')
    
    # MongoDB Configuration
    MONGO_URI = os.environ.get('MONGO_URI', '')
    MONGO_DB_NAME = os.environ.get('MONGO_DB_NAME', 'nutrilicious_db')
    
    # Gemini AI (untuk chatbot RAG)
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

    # Xendit Payment Gateway
    XENDIT_SECRET_KEY = os.environ.get('XENDIT_SECRET_KEY', '')
    XENDIT_WEBHOOK_TOKEN = os.environ.get('XENDIT_WEBHOOK_TOKEN', '')

    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-jwt-secret-change-me')
    JWT_ACCESS_TOKEN_EXPIRES_HOURS = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES_HOURS', 24))

    # Flask-Mail (SMTP) Configuration
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', '')

    # Admin credentials
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', '')

    # CORS
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')

    # Frontend URL (untuk redirect Xendit setelah pembayaran)
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

    # Google OAuth
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
    
    # Flask
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    HOST = os.environ.get('FLASK_HOST', '0.0.0.0')
    PORT = int(os.environ.get('FLASK_PORT', 5000))
