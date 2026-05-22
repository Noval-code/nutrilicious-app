"""
Cloudinary Helper — Konfigurasi & Upload Utility
Digunakan untuk upload dan hapus gambar menu ke Cloudinary CDN.
"""

import os
import cloudinary
import cloudinary.uploader


def init_cloudinary():
    """Inisialisasi Cloudinary SDK dari environment variables"""
    cloudinary.config(
        cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
        api_key=os.environ.get('CLOUDINARY_API_KEY'),
        api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
        secure=True
    )


def upload_image(file, folder="nutrilicious/menus"):
    """
    Upload file ke Cloudinary.
    Args:
        file: file object (dari request.files) atau path string
        folder: folder tujuan di Cloudinary
    Returns:
        dict dengan 'url' (secure_url) dan 'public_id'
    """
    result = cloudinary.uploader.upload(
        file,
        folder=folder,
        resource_type="image",
        transformation=[
            {"quality": "auto", "fetch_format": "auto"}
        ]
    )
    return {
        "url": result["secure_url"],
        "public_id": result["public_id"]
    }


def delete_image(public_id):
    """Hapus gambar dari Cloudinary berdasarkan public_id"""
    if public_id:
        try:
            cloudinary.uploader.destroy(public_id)
        except Exception as e:
            print(f"[WARN] Gagal hapus gambar Cloudinary ({public_id}): {e}")
