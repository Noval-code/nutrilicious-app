"""
Nutrilicious Flask Backend
Main Application Entry Point

Menjalankan server:
    python app.py

Endpoints:
    POST               /api/auth/register          - Daftar akun baru
    POST               /api/auth/verify-email      - Verifikasi OTP email
    POST               /api/auth/resend-otp        - Kirim ulang OTP
    POST               /api/auth/login             - Login user
    POST               /api/auth/google            - Login/Register via Google OAuth
    POST               /api/auth/admin-login       - Login admin
    GET                /api/auth/me                - Data user aktif (JWT)
    POST               /api/auth/change-password   - Ubah password (JWT)
    GET/PUT            /api/users/me               - Profil user (JWT)
    GET/POST           /api/materials              - CRUD bahan baku
    GET/PUT/DELETE      /api/materials/<id>
    GET/POST           /api/menus                  - CRUD menu
    GET/PUT/DELETE      /api/menus/<id>
    GET/POST           /api/packages               - CRUD paket langganan
    GET/PUT/DELETE      /api/packages/<id>
    GET                /api/dashboard/stats
    GET                /api/dashboard/popular-menus
    GET                /api/dashboard/featured-menus
    POST               /api/chat                   - Chatbot NutriBot
    POST               /api/chat/reindex
    POST               /api/prediction/train        - Training model RF
    GET                /api/prediction/forecast     - Prediksi 1 minggu
    GET                /api/prediction/accuracy     - Metrik evaluasi
    GET                /api/prediction/feature-importance
    GET                /api/prediction/history
    GET                /api/prediction/test-results
"""

from dotenv import load_dotenv
load_dotenv()  # Muat variabel dari backend/.env

import logging
import smtplib

# Suppress SMTP debug noise di terminal
logging.getLogger('mail.log').setLevel(logging.WARNING)
smtplib.SMTP.debuglevel = 0

from datetime import timedelta

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_compress import Compress

from config import Config
from db import close_db

# Import blueprints
from routes.auth import auth_bp
from routes.materials import materials_bp
from routes.menus import menus_bp
from routes.packages import packages_bp
from routes.dashboard import dashboard_bp
from routes.chat import chat_bp
from routes.transactions import transactions_bp
from routes.users import users_bp
from routes.upload import upload_bp
from routes.schedules import schedules_bp
from routes.prediction import prediction_bp
from cloudinary_helper import init_cloudinary

# Inisialisasi Mail instance (agar bisa diimport di auth.py)
mail = Mail()


def create_app():
    """Application factory"""
    app = Flask(__name__)
    app.url_map.strict_slashes = False  # Hindari redirect 308 yang menghilangkan Authorization header
    app.config.from_object(Config)

    # JWT configuration
    app.config['JWT_SECRET_KEY'] = Config.JWT_SECRET_KEY
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=Config.JWT_ACCESS_TOKEN_EXPIRES_HOURS)

    # Flask-Mail configuration
    app.config['MAIL_SERVER']         = Config.MAIL_SERVER
    app.config['MAIL_PORT']           = Config.MAIL_PORT
    app.config['MAIL_USE_TLS']        = Config.MAIL_USE_TLS
    app.config['MAIL_USERNAME']       = Config.MAIL_USERNAME
    app.config['MAIL_PASSWORD']       = Config.MAIL_PASSWORD
    app.config['MAIL_DEFAULT_SENDER'] = Config.MAIL_DEFAULT_SENDER
    app.config['MAIL_DEBUG']          = False   # Jangan tampilkan log SMTP ke terminal

    # Inisialisasi Cloudinary
    init_cloudinary()

    # Enable CORS for Next.js frontend
    CORS(
        app, 
        origins=Config.CORS_ORIGINS, 
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"]
    )

    # Init extensions
    JWTManager(app)
    mail.init_app(app)
    Compress(app)  # Kompres semua HTTP response >500 bytes (gzip/brotli)

    # Register blueprints
    app.register_blueprint(auth_bp,         url_prefix='/api/auth')
    app.register_blueprint(materials_bp,    url_prefix='/api/materials')
    app.register_blueprint(menus_bp,        url_prefix='/api/menus')
    app.register_blueprint(packages_bp,     url_prefix='/api/packages')
    app.register_blueprint(dashboard_bp,    url_prefix='/api/dashboard')
    app.register_blueprint(chat_bp,         url_prefix='/api/chat')
    app.register_blueprint(transactions_bp, url_prefix='/api/transactions')
    app.register_blueprint(users_bp,        url_prefix='/api/users')
    app.register_blueprint(upload_bp,       url_prefix='/api/upload')
    app.register_blueprint(schedules_bp,    url_prefix='/api/schedules')
    app.register_blueprint(prediction_bp,   url_prefix='/api/prediction')

    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'ok',
            'message': 'Nutrilicious API is running 🚀',
            'version': '2.0.0',
            'auth': 'JWT (custom)'
        })

    # Cleanup on app teardown
    @app.teardown_appcontext
    def teardown(exception):
        pass  # Connection pooling handled by pymongo

    return app


if __name__ == '__main__':
    app = create_app()
    print()
    print("=" * 55)
    print("  Nutrilicious Backend API v2.0")
    print("  Running at: http://localhost:5000")
    print("  MongoDB:    nutrilicious_db")
    print("  CORS:       http://localhost:3000")
    print("  Auth:       JWT (manual, no Clerk)")
    print("=" * 55)
    print()
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    )
