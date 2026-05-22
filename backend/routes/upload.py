"""
API Routes untuk Upload Gambar ke Cloudinary
"""

from flask import Blueprint, request, jsonify
from cloudinary_helper import upload_image

upload_bp = Blueprint('upload', __name__)

# Ekstensi file yang diperbolehkan
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}


def allowed_file(filename):
    """Cek apakah ekstensi file diperbolehkan"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@upload_bp.route('/', methods=['POST'])
def upload_file():
    """
    Upload gambar ke Cloudinary dan return URL-nya.
    
    Request: multipart/form-data
        - file: file gambar (required)
        - folder: folder tujuan di Cloudinary (optional, default: nutrilicious/menus)
    
    Response:
        { "url": "https://res.cloudinary.com/...", "public_id": "nutrilicious/menus/xxx" }
    """
    if 'file' not in request.files:
        return jsonify({'error': 'Tidak ada file yang di-upload'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Nama file kosong'}), 400

    if not allowed_file(file.filename):
        ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else 'unknown'
        return jsonify({'error': f'Format file tidak didukung: .{ext}. Gunakan: png, jpg, jpeg, webp, gif'}), 400

    # Max file size: 5MB (Cloudinary free tier limit: 10MB, kita batas 5MB)
    file.seek(0, 2)  # seek to end
    size = file.tell()
    file.seek(0)     # seek back to start
    if size > 5 * 1024 * 1024:
        return jsonify({'error': 'Ukuran file terlalu besar. Maksimal 5MB.'}), 400

    folder = request.form.get('folder', 'nutrilicious/menus')

    try:
        result = upload_image(file, folder=folder)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': f'Gagal upload ke Cloudinary: {str(e)}'}), 500
