"""
API Routes untuk Autentikasi Manual (Register, Verify Email, Login, Logout)
Menggunakan JWT + bcrypt + Flask-Mail (OTP via SMTP)
+ Google OAuth (Sign in with Google)
"""

import re
import bcrypt
import random
import string
from datetime import datetime, timedelta, timezone

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
from flask_mail import Message
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from db import get_db

auth_bp = Blueprint('auth', __name__)


# ──────────────────────────────────────────────────────────────────────────────
# Helper: validasi kekuatan password
# ──────────────────────────────────────────────────────────────────────────────
def _validate_password(password: str) -> str | None:
    """Validasi password. Return pesan error jika tidak valid, None jika OK."""
    if len(password) < 8:
        return 'Password minimal 8 karakter.'
    if not re.search(r'[A-Z]', password):
        return 'Password harus mengandung minimal 1 huruf kapital (uppercase).'
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':",.<>?/\\|`~]', password):
        return 'Password harus mengandung minimal 1 simbol (contoh: !@#$%^&*).'
    return None


# ──────────────────────────────────────────────────────────────────────────────
# Helper: kirim OTP ke email
# ──────────────────────────────────────────────────────────────────────────────
def _generate_otp(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))


def _send_verification_email(mail, to_email: str, otp: str, name: str):
    """Kirim email berisi kode OTP verifikasi."""
    subject = "Kode Verifikasi Akun Nutrilicious"
    body = f"""
Halo {name},

Terima kasih sudah mendaftar di Nutrilicious! 🥗

Gunakan kode berikut untuk memverifikasi akun Anda:

    ┌─────────────────┐
    │   {otp}   │
    └─────────────────┘

Kode ini berlaku selama 15 menit.

Jika Anda tidak merasa mendaftar, abaikan email ini.

Salam sehat,
Tim Nutrilicious Food
    """
    msg = Message(subject=subject, recipients=[to_email], body=body)
    mail.send(msg)


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/auth/register
# ──────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/register', methods=['POST'])
def register():
    """Daftar akun baru. Kirim OTP ke email."""
    db = get_db()
    data = request.get_json()

    name     = (data.get('name', '') or '').strip()
    email    = (data.get('email', '') or '').strip().lower()
    password = (data.get('password', '') or '').strip()

    # Validasi input
    if not name or not email or not password:
        return jsonify({'error': 'Nama, email, dan password wajib diisi.'}), 400
    pw_error = _validate_password(password)
    if pw_error:
        return jsonify({'error': pw_error}), 400

    # Cek email sudah terdaftar
    if db['users'].find_one({'email': email}):
        return jsonify({'error': 'Email sudah terdaftar.'}), 409

    # Hash password
    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # Generate OTP
    otp = _generate_otp()
    otp_expires = datetime.now(timezone.utc) + timedelta(minutes=15)

    now = datetime.now(timezone.utc)
    db['users'].insert_one({
        'name': name,
        'email': email,
        'password': hashed_pw,
        'is_verified': False,
        'otp': otp,
        'otp_expires': otp_expires,
        'phone': '',
        'address': '',
        'lat': None,
        'lng': None,
        'role': 'user',
        'created_at': now,
        'updated_at': now,
    })

    # Kirim email OTP
    try:
        from app import mail as flask_mail_instance
        _send_verification_email(flask_mail_instance, email, otp, name)
    except Exception as e:
        current_app.logger.warning(f"Gagal kirim email OTP: {e}")
        # Tetap lanjutkan — OTP bisa dilihat di log untuk development
        current_app.logger.info(f"[DEV] OTP untuk {email}: {otp}")

    return jsonify({'message': 'Registrasi berhasil! Cek email Anda untuk kode verifikasi.'}), 201


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/auth/verify-email
# ──────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    """Verifikasi OTP yang dikirim ke email."""
    db = get_db()
    data = request.get_json()

    email = (data.get('email', '') or '').strip().lower()
    otp   = (data.get('otp', '') or '').strip()

    if not email or not otp:
        return jsonify({'error': 'Email dan OTP wajib diisi.'}), 400

    user = db['users'].find_one({'email': email})
    if not user:
        return jsonify({'error': 'Email tidak ditemukan.'}), 404

    if user.get('is_verified'):
        return jsonify({'message': 'Akun sudah terverifikasi.'}), 200

    # Cek OTP
    if user.get('otp') != otp:
        return jsonify({'error': 'Kode OTP salah.'}), 400

    # Cek expiry
    otp_expires = user.get('otp_expires')
    if otp_expires:
        if otp_expires.tzinfo is None:
            otp_expires = otp_expires.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > otp_expires:
            return jsonify({'error': 'Kode OTP sudah kedaluwarsa.'}), 400

    # Tandai terverifikasi
    db['users'].update_one(
        {'email': email},
        {'$set': {'is_verified': True, 'otp': None, 'otp_expires': None, 'updated_at': datetime.now(timezone.utc)}}
    )

    # Buat token langsung setelah verifikasi
    user = db['users'].find_one({'email': email})
    user_id = str(user['_id'])
    access_token = create_access_token(
        identity=user_id,
        additional_claims={'email': email, 'name': user['name'], 'role': user.get('role', 'user')}
    )

    return jsonify({
        'message': 'Email berhasil diverifikasi!',
        'access_token': access_token,
        'user': {
            'id': user_id,
            'name': user['name'],
            'email': user['email'],
            'role': user.get('role', 'user'),
        }
    }), 200


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/auth/resend-otp
# ──────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/resend-otp', methods=['POST'])
def resend_otp():
    """Kirim ulang OTP ke email."""
    db = get_db()
    data = request.get_json()
    email = (data.get('email', '') or '').strip().lower()

    if not email:
        return jsonify({'error': 'Email wajib diisi.'}), 400

    user = db['users'].find_one({'email': email})
    if not user:
        return jsonify({'error': 'Email tidak ditemukan.'}), 404
    if user.get('is_verified'):
        return jsonify({'message': 'Akun sudah terverifikasi.'}), 200

    otp = _generate_otp()
    otp_expires = datetime.now(timezone.utc) + timedelta(minutes=15)

    db['users'].update_one(
        {'email': email},
        {'$set': {'otp': otp, 'otp_expires': otp_expires}}
    )

    try:
        from app import mail as flask_mail_instance
        _send_verification_email(flask_mail_instance, email, otp, user['name'])
    except Exception as e:
        current_app.logger.warning(f"Gagal kirim ulang OTP: {e}")
        current_app.logger.info(f"[DEV] OTP baru untuk {email}: {otp}")

    return jsonify({'message': 'Kode OTP baru telah dikirim ke email Anda.'}), 200


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/auth/login
# ──────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/login', methods=['POST'])
def login():
    """Login dengan email + password. Return JWT."""
    db = get_db()
    data = request.get_json()

    email    = (data.get('email', '') or '').strip().lower()
    password = (data.get('password', '') or '').strip()

    if not email or not password:
        return jsonify({'error': 'Email dan password wajib diisi.'}), 400

    user = db['users'].find_one({'email': email})
    if not user:
        return jsonify({'error': 'Email atau password salah.'}), 401

    # Cek password
    if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
        return jsonify({'error': 'Email atau password salah.'}), 401

    # Cek verifikasi email
    if not user.get('is_verified', False):
        return jsonify({
            'error': 'Akun belum diverifikasi.',
            'need_verification': True,
            'email': email
        }), 403

    user_id = str(user['_id'])
    access_token = create_access_token(
        identity=user_id,
        additional_claims={'email': email, 'name': user['name'], 'role': user.get('role', 'user')}
    )

    return jsonify({
        'access_token': access_token,
        'user': {
            'id': user_id,
            'name': user['name'],
            'email': user['email'],
            'role': user.get('role', 'user'),
        }
    }), 200


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/auth/google
# ──────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/google', methods=['POST'])
def google_login():
    """Login/Register via Google OAuth. Menerima Google ID Token (credential) dari frontend."""
    import requests as http_requests
    from config import Config
    db = get_db()
    data = request.get_json()

    token = (data.get('credential') or data.get('id_token', '')).strip()
    if not token:
        return jsonify({'error': 'Google token wajib dikirim.'}), 400

    google_id = None
    email = None
    name = None

    client_id = Config.GOOGLE_CLIENT_ID
    current_app.logger.info(f"[Google Auth] Attempting verification, client_id={client_id[:20]}...")

    # Verifikasi Google ID Token (credential dari GoogleLogin component)
    try:
        idinfo = google_id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            client_id,
            clock_skew_in_seconds=10
        )
        google_id = idinfo.get('sub')
        email = idinfo.get('email', '').lower()
        name = idinfo.get('name', '')
        current_app.logger.info(f"[Google Auth] ID Token verified OK for {email}")
    except ValueError as e:
        error_msg = str(e)
        current_app.logger.warning(f"[Google Auth] ID Token verify failed: {error_msg}")

        # Jika gagal karena audience mismatch, coba tanpa audience check
        if 'audience' in error_msg.lower() or 'aud' in error_msg.lower():
            current_app.logger.info("[Google Auth] Retrying without audience check...")
            try:
                idinfo = google_id_token.verify_oauth2_token(
                    token,
                    google_requests.Request(),
                    audience=None,
                    clock_skew_in_seconds=10
                )
                google_id = idinfo.get('sub')
                email = idinfo.get('email', '').lower()
                name = idinfo.get('name', '')
                current_app.logger.info(f"[Google Auth] ID Token verified (no audience) for {email}")
            except Exception as e2:
                current_app.logger.error(f"[Google Auth] Retry also failed: {e2}")
                return jsonify({'error': f'Verifikasi Google gagal: {error_msg}'}), 401
        else:
            # Coba sebagai access token (fallback untuk implicit flow)
            try:
                current_app.logger.info("[Google Auth] Trying as access token...")
                userinfo_res = http_requests.get(
                    'https://www.googleapis.com/oauth2/v3/userinfo',
                    headers={'Authorization': f'Bearer {token}'},
                    timeout=10
                )
                if userinfo_res.status_code != 200:
                    current_app.logger.error(f"[Google Auth] Userinfo API returned {userinfo_res.status_code}: {userinfo_res.text}")
                    return jsonify({'error': f'Verifikasi Google gagal: {error_msg}'}), 401
                userinfo = userinfo_res.json()
                google_id = userinfo.get('sub')
                email = (userinfo.get('email') or '').lower()
                name = userinfo.get('name', '')
                current_app.logger.info(f"[Google Auth] Access token verified for {email}")
            except Exception as e2:
                current_app.logger.error(f"[Google Auth] All verification methods failed: {e2}")
                return jsonify({'error': f'Verifikasi Google gagal: {error_msg}'}), 401
    except Exception as e:
        current_app.logger.error(f"[Google Auth] Unexpected error: {type(e).__name__}: {e}")
        return jsonify({'error': f'Gagal memverifikasi token Google: {str(e)}'}), 401

    if not email:
        return jsonify({'error': 'Email tidak ditemukan di akun Google.'}), 400

    now = datetime.now(timezone.utc)

    # Cek apakah user sudah ada di database
    user = db['users'].find_one({'email': email})

    if user:
        # User sudah ada → update google_id dan pastikan terverifikasi
        update_fields = {
            'is_verified': True,
            'google_id': google_id,
            'updated_at': now,
        }
        # Jika belum punya auth_provider, set ke 'google' atau 'both'
        if not user.get('auth_provider'):
            update_fields['auth_provider'] = 'both' if user.get('password') else 'google'
        elif user.get('auth_provider') == 'manual' and user.get('password'):
            update_fields['auth_provider'] = 'both'

        db['users'].update_one({'email': email}, {'$set': update_fields})
        user = db['users'].find_one({'email': email})
    else:
        # User baru → buat akun otomatis (tanpa password, auto-verified)
        db['users'].insert_one({
            'name': name,
            'email': email,
            'password': None,
            'is_verified': True,
            'auth_provider': 'google',
            'google_id': google_id,
            'otp': None,
            'otp_expires': None,
            'phone': '',
            'address': '',
            'lat': None,
            'lng': None,
            'role': 'user',
            'created_at': now,
            'updated_at': now,
        })
        user = db['users'].find_one({'email': email})

    user_id = str(user['_id'])
    access_token = create_access_token(
        identity=user_id,
        additional_claims={'email': email, 'name': user['name'], 'role': user.get('role', 'user')}
    )

    return jsonify({
        'access_token': access_token,
        'user': {
            'id': user_id,
            'name': user['name'],
            'email': user['email'],
            'role': user.get('role', 'user'),
        }
    }), 200


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/auth/admin-login
# ──────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/admin-login', methods=['POST'])
def admin_login():
    """Login admin dengan username + password dari config."""
    from config import Config
    data = request.get_json()

    username = (data.get('username', '') or '').strip()
    password = (data.get('password', '') or '').strip()

    if username != Config.ADMIN_USERNAME or password != Config.ADMIN_PASSWORD:
        return jsonify({'error': 'Username atau password admin salah.'}), 401

    access_token = create_access_token(
        identity='admin',
        additional_claims={'email': 'admin@nutrilicious.local', 'name': 'Admin', 'role': 'admin'}
    )

    return jsonify({
        'access_token': access_token,
        'user': {'id': 'admin', 'name': 'Admin', 'email': 'admin@nutrilicious.local', 'role': 'admin'}
    }), 200


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/auth/me
# ──────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    """Ambil data user yang sedang login dari JWT."""
    from bson import ObjectId
    db = get_db()

    user_id = get_jwt_identity()

    # Admin tidak ada di DB
    if user_id == 'admin':
        return jsonify({'id': 'admin', 'name': 'Admin', 'email': 'admin@nutrilicious.local', 'role': 'admin'})

    try:
        user = db['users'].find_one({'_id': ObjectId(user_id)}, {'password': 0, 'otp': 0})
    except Exception:
        return jsonify({'error': 'User tidak ditemukan.'}), 404

    if not user:
        return jsonify({'error': 'User tidak ditemukan.'}), 404

    user['id'] = str(user.pop('_id'))
    return jsonify(user), 200


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/auth/change-password
# ──────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Ubah password user yang sedang login."""
    from bson import ObjectId
    db = get_db()

    user_id = get_jwt_identity()
    data = request.get_json()

    current_pw = (data.get('current_password', '') or '').strip()
    new_pw     = (data.get('new_password', '') or '').strip()

    if not current_pw or not new_pw:
        return jsonify({'error': 'Password lama dan baru wajib diisi.'}), 400
    pw_error = _validate_password(new_pw)
    if pw_error:
        return jsonify({'error': pw_error}), 400

    try:
        user = db['users'].find_one({'_id': ObjectId(user_id)})
    except Exception:
        return jsonify({'error': 'User tidak ditemukan.'}), 404

    if not user:
        return jsonify({'error': 'User tidak ditemukan.'}), 404

    # User Google-only tidak punya password
    if not user.get('password'):
        return jsonify({'error': 'Akun Anda terdaftar via Google. Silakan gunakan login Google.'}), 400

    if not bcrypt.checkpw(current_pw.encode('utf-8'), user['password'].encode('utf-8')):
        return jsonify({'error': 'Password lama salah.'}), 400

    new_hashed = bcrypt.hashpw(new_pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    db['users'].update_one(
        {'_id': ObjectId(user_id)},
        {'$set': {'password': new_hashed, 'updated_at': datetime.now(timezone.utc)}}
    )

    return jsonify({'message': 'Password berhasil diubah.'}), 200


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/auth/forgot-password
# ──────────────────────────────────────────────────────────────────────────────
def _send_reset_password_email(mail, to_email: str, otp: str, name: str):
    """Kirim email berisi kode OTP untuk reset password."""
    subject = "Reset Password Akun Nutrilicious"
    body = f"""
Halo {name},

Kami menerima permintaan untuk mereset password akun Anda.

Gunakan kode berikut untuk mengatur ulang password Anda:

    ┌─────────────────┐
    │   {otp}   │
    └─────────────────┘

Kode ini berlaku selama 15 menit.

Jika Anda tidak meminta reset password, abaikan email ini.
Password Anda tidak akan berubah.

Salam sehat,
Tim Nutrilicious Food
    """
    msg = Message(subject=subject, recipients=[to_email], body=body)
    mail.send(msg)


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Kirim OTP reset password ke email user."""
    db = get_db()
    data = request.get_json()

    email = (data.get('email', '') or '').strip().lower()

    if not email:
        return jsonify({'error': 'Email wajib diisi.'}), 400

    user = db['users'].find_one({'email': email})
    if not user:
        # Untuk keamanan, tetap kembalikan pesan sukses
        # agar attacker tidak bisa enumerasi email
        return jsonify({'message': 'Kode OTP telah dikirim.'}), 200

    if not user.get('is_verified', False):
        return jsonify({'error': 'Akun belum diverifikasi. Silakan verifikasi email terlebih dahulu.'}), 400

    otp = _generate_otp()
    otp_expires = datetime.now(timezone.utc) + timedelta(minutes=15)

    db['users'].update_one(
        {'email': email},
        {'$set': {
            'reset_otp': otp,
            'reset_otp_expires': otp_expires,
        }}
    )

    try:
        from app import mail as flask_mail_instance
        _send_reset_password_email(flask_mail_instance, email, otp, user['name'])
    except Exception as e:
        current_app.logger.warning(f"Gagal kirim email reset password: {e}")
        current_app.logger.info(f"[DEV] Reset OTP untuk {email}: {otp}")

    return jsonify({'message': 'Kode OTP telah dikirim.'}), 200


# ──────────────────────────────────────────────────────────────────────────────
# POST /api/auth/reset-password
# ──────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Verifikasi OTP dan reset password."""
    db = get_db()
    data = request.get_json()

    email    = (data.get('email', '') or '').strip().lower()
    otp      = (data.get('otp', '') or '').strip()
    new_pw   = (data.get('new_password', '') or '').strip()

    if not email or not otp or not new_pw:
        return jsonify({'error': 'Email, OTP, dan password baru wajib diisi.'}), 400
    pw_error = _validate_password(new_pw)
    if pw_error:
        return jsonify({'error': pw_error}), 400

    user = db['users'].find_one({'email': email})
    if not user:
        return jsonify({'error': 'Email tidak ditemukan.'}), 404

    # Cek OTP
    if user.get('reset_otp') != otp:
        return jsonify({'error': 'Kode OTP salah.'}), 400

    # Cek expiry
    otp_expires = user.get('reset_otp_expires')
    if otp_expires:
        if otp_expires.tzinfo is None:
            otp_expires = otp_expires.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > otp_expires:
            return jsonify({'error': 'Kode OTP sudah kedaluwarsa. Silakan minta kode baru.'}), 400

    # Hash password baru
    new_hashed = bcrypt.hashpw(new_pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    db['users'].update_one(
        {'email': email},
        {'$set': {
            'password': new_hashed,
            'reset_otp': None,
            'reset_otp_expires': None,
            'updated_at': datetime.now(timezone.utc),
        }}
    )

    return jsonify({'message': 'Password berhasil direset! Silakan login dengan password baru Anda.'}), 200
