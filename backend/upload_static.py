"""
Script one-time: Upload gambar static (public/images) ke Cloudinary
Jalankan dari folder backend: python upload_static.py
"""

import os
from dotenv import load_dotenv
load_dotenv()

from cloudinary_helper import init_cloudinary, upload_image

init_cloudinary()

# Path ke folder public/images (relatif dari backend/)
STATIC_DIR = os.path.join('..', 'public', 'images')

files = ['hero_plate.png', 'floating_broccoli.png', 'floating_tomato.png']

print("=" * 55)
print("  Upload gambar static ke Cloudinary")
print("=" * 55)
print()

results = {}
for f in files:
    path = os.path.join(STATIC_DIR, f)
    if os.path.exists(path):
        try:
            result = upload_image(path, folder='nutrilicious/static')
            results[f] = result['url']
            print(f"[OK] {f}")
            print(f"     -> {result['url']}")
            print()
        except Exception as e:
            print(f"[ERROR] {f}: {e}")
            print()
    else:
        print(f"[SKIP] {f} tidak ditemukan di {path}")
        print()

print("=" * 55)
print("  Selesai! Salin URL di atas ke HeroSection.tsx")
print("=" * 55)
