"""
Seed script - Memasukkan semua data dummy ke MongoDB
Jalankan: python seed.py
"""

from db import get_db

def seed_materials():
    """Seed data bahan baku"""
    db = get_db()
    collection = db['materials']
    
    # Hapus data lama
    collection.delete_many({})
    
    materials = [
        { "name": "Beras Merah organik", "unit": "gram", "stock": 12500, "min_stock": 5000 },
        { "name": "Ayam Fillet Fresh", "unit": "gram", "stock": 8000, "min_stock": 10000 },
        { "name": "Telur Ayam", "unit": "butir", "stock": 150, "min_stock": 50 },
        { "name": "Brokoli", "unit": "gram", "stock": 2000, "min_stock": 3000 },
        { "name": "Minyak Zaitun", "unit": "ml", "stock": 5000, "min_stock": 1000 },
        { "name": "Bawang Putih", "unit": "gram", "stock": 1500, "min_stock": 500 },
        { "name": "Wortel", "unit": "gram", "stock": 3000, "min_stock": 2000 },
        { "name": "Kentang", "unit": "gram", "stock": 6000, "min_stock": 3000 },
        { "name": "Buncis", "unit": "gram", "stock": 1800, "min_stock": 1000 },
        { "name": "Daging Sapi Premium", "unit": "gram", "stock": 4500, "min_stock": 5000 },
        { "name": "Ikan Dori Fillet", "unit": "gram", "stock": 3500, "min_stock": 3000 },
        { "name": "Tempe", "unit": "gram", "stock": 4000, "min_stock": 2000 },
        { "name": "Tahu Sutra", "unit": "gram", "stock": 3200, "min_stock": 2000 },
        { "name": "Jamur Champignon", "unit": "gram", "stock": 1200, "min_stock": 1500 },
        { "name": "Pasta Fettucini", "unit": "gram", "stock": 5000, "min_stock": 2000 },
        { "name": "Spaghetti", "unit": "gram", "stock": 4000, "min_stock": 2000 },
        { "name": "Keju Cheddar", "unit": "gram", "stock": 800, "min_stock": 500 },
        { "name": "Susu Full Cream", "unit": "ml", "stock": 6000, "min_stock": 3000 },
        { "name": "Mentega", "unit": "gram", "stock": 2000, "min_stock": 1000 },
        { "name": "Nasi Putih", "unit": "gram", "stock": 15000, "min_stock": 8000 },
        { "name": "Lemon", "unit": "butir", "stock": 45, "min_stock": 20 },
        { "name": "Jahe Segar", "unit": "gram", "stock": 500, "min_stock": 300 },
        { "name": "Daun Selada", "unit": "gram", "stock": 1000, "min_stock": 800 },
        { "name": "Tomat Segar", "unit": "gram", "stock": 2500, "min_stock": 1500 },
        { "name": "Bayam", "unit": "gram", "stock": 1200, "min_stock": 1000 },
        { "name": "Roti Gandum", "unit": "gram", "stock": 2000, "min_stock": 1500 },
        { "name": "Smoked Beef", "unit": "gram", "stock": 1500, "min_stock": 1000 },
        { "name": "Madu", "unit": "ml", "stock": 1500, "min_stock": 500 },
        { "name": "Saus BBQ", "unit": "ml", "stock": 2000, "min_stock": 800 },
        { "name": "Mayonnaise", "unit": "ml", "stock": 2500, "min_stock": 1000 },
        { "name": "Saus Wijen", "unit": "ml", "stock": 1000, "min_stock": 500 },
        { "name": "Saus Thousand Island", "unit": "ml", "stock": 1200, "min_stock": 600 },
        { "name": "Yogurt Plain", "unit": "ml", "stock": 3000, "min_stock": 1500 },
        { "name": "Buah Naga", "unit": "gram", "stock": 2000, "min_stock": 1000 },
        { "name": "Melon", "unit": "gram", "stock": 2500, "min_stock": 1200 },
        { "name": "Semangka", "unit": "gram", "stock": 3000, "min_stock": 1500 },
        { "name": "Jambu Biji", "unit": "gram", "stock": 2000, "min_stock": 1000 },
        { "name": "Daun Mint", "unit": "gram", "stock": 200, "min_stock": 100 },
        { "name": "Rice Paper", "unit": "lembar", "stock": 200, "min_stock": 100 },
        { "name": "Kacang Tanah", "unit": "gram", "stock": 1500, "min_stock": 800 },
        { "name": "Lada Hitam", "unit": "gram", "stock": 300, "min_stock": 150 },
        { "name": "Garam Himalaya", "unit": "gram", "stock": 1000, "min_stock": 300 },
        { "name": "Bawang Merah", "unit": "gram", "stock": 2000, "min_stock": 1000 },
        { "name": "Cabai Merah", "unit": "gram", "stock": 800, "min_stock": 500 },
        { "name": "Daun Jeruk", "unit": "gram", "stock": 200, "min_stock": 100 },
        { "name": "Serai", "unit": "gram", "stock": 400, "min_stock": 200 },
        { "name": "Kunyit", "unit": "gram", "stock": 350, "min_stock": 150 },
        { "name": "Asam Jawa", "unit": "gram", "stock": 300, "min_stock": 150 },
    ]
    
    result = collection.insert_many(materials)
    print(f"[OK] Berhasil seed {len(result.inserted_ids)} bahan baku")
    return result


def seed_menus():
    """Seed data menu"""
    db = get_db()
    collection = db['menus']
    
    # Hapus data lama
    collection.delete_many({})
    
    menus = [
        # === LUNCH MENU ===
        { "title": "Mashed Potatoes & Cordon Bleu", "category": "lunch", "items": ["Mashed Potatoes", "Chicken Cordon Bleu", "Bola-Bola Tempe", "Salad Saus Mayonnaise"] },
        { "title": "Fettucini Carbonara & Beef Patty", "category": "lunch", "items": ["Fettucini Carbonara", "Beef Patty Saus BBQ", "Mixed Vegetables", "Jamur Crispy"] },
        { "title": "Spaghetti & Bola-Bola Daging", "category": "lunch", "items": ["Spaghetti Garlic", "Bola-Bola Daging", "Jamur Crispy", "Salad Thousand Island"] },
        { "title": "Mashed Potatoes & Omelete", "category": "lunch", "items": ["Mashed Potato", "Chicken Bolognese", "Omelete", "Salad Saus Wijen"] },
        { "title": "Chicken Steak Saus Mushroom", "category": "lunch", "items": ["Potato Wedges", "Steak Ayam Saus Mushroom", "Mix Vegetables Sautéed", "Jamur Crispy"] },
        { "title": "Nasi Merah Ikan Cabe Garam", "category": "lunch", "items": ["Nasi Merah", "Ikan Cabe Garam", "Telur Rebus", "Tumis Buncis"] },
        { "title": "Nasi Putih Ayam Saus Madu", "category": "lunch", "items": ["Nasi Putih", "Ayam Saus Madu", "Bola-Bola Tahu", "Salad & Saus Wijen Sambal"] },
        { "title": "Nasi Butter Ikan Saus Lemon", "category": "lunch", "items": ["Nasi Butter", "Ikan Saus Lemon", "Telor Rebus", "Salad Saus Mayonnaise"] },
        { "title": "Nasi Putih Ikan Asam Pedas", "category": "lunch", "items": ["Nasi Putih", "Ikan Asam Pedas", "Tahu Jamur", "Salad Saus Wijen"] },
        { "title": "Nasi Putih Ayam Tim Jahe", "category": "lunch", "items": ["Nasi Putih", "Ayam Tim Jahe", "Jamur Crispy", "Salad & Sause Thousand Island"] },
        { "title": "Nasi Putih Ayam Bumbu Pedas", "category": "lunch", "items": ["Nasi Putih", "Ayam Bumbu Pedas", "Tempe Bakar", "Salad Saus Mayonnaise"] },
        { "title": "Nasi Putih Ikan Pesmol", "category": "lunch", "items": ["Nasi Putih", "Ikan Pesmol", "Tempe Bakar", "Salad Saus Mayonnaise"] },
        { "title": "Nasi Putih Ayam Lada Hitam", "category": "lunch", "items": ["Nasi Putih", "Ayam Lada Hitam", "Rolade Tempe", "Salad & Saus Thousand Island"] },
        { "title": "Nasi Merah Ikan Dabu-Dabu", "category": "lunch", "items": ["Nasi Merah", "Ikan Dabu-Dabu", "Telor Rebus", "Tumis Buncis Wortel"] },
        
        # === DINNER MENU ===
        { "title": "Spring Roll Salad", "category": "dinner", "items": ["Pan-Seared Chicken", "Rice Paper Roll", "Fresh Greens", "Special Sauce"] },
        { "title": "Vegetable Sandwich", "category": "dinner", "items": ["Boiled Eggs", "Whole Wheat Bread", "Fresh Greens", "Healthy Dressing"] },
        { "title": "Omelette & Smoked Beef", "category": "dinner", "items": ["Smoked Beef", "Omelette Sandwich", "Fresh Greens", "Tomato"] },
        { "title": "Triple Decker Sandwich", "category": "dinner", "items": ["Triple Layar Sandwich", "Potato Chips", "Fresh Lettuce", "Meat Slices"] },
        { "title": "Tropical Fruit Salad", "category": "dinner", "items": ["Fresh Seasonal Fruits", "Cheese Grating", "Sweet Dressing"] },
        { "title": "Yogurt Salad", "category": "dinner", "items": ["Fresh Fruits", "Dragon Fruit & Melon", "Healthy Yogurt Dressing", "Cheese Grating"] },
        { "title": "Boiled Vegetables", "category": "dinner", "items": ["Peanut Sauce (Pecel)", "Tofu & Tempeh", "Boiled Greens", "Potato"] },
        { "title": "Pan Seared Chicken Salad", "category": "dinner", "items": ["Pan Seared Chicken Breast", "Potato", "Fresh Greens & Tomato", "Special Dressing"] },
    ]
    
    result = collection.insert_many(menus)
    print(f"[OK] Berhasil seed {len(result.inserted_ids)} menu")
    return result


def seed_packages():
    """Seed data paket langganan"""
    db = get_db()
    collection = db['packages']
    
    # Hapus data lama
    collection.delete_many({})
    
    packages = [
        {
            "slug": "low-carbs",
            "category": "Low Carbs",
            "icon": "Leaf",
            "description": "Diet rendah karbohidrat yang kaya akan serat. Pilihan cerdas untuk program weight loss intensif dan sehat.",
            "subscribers": 45,
            "pricing": {
                "5 Hari": {
                    "Lunch": { "normal": "180.000", "promo": "150.000" },
                    "Dinner": { "normal": "180.000", "promo": "150.000" },
                    "Lunch & Dinner": { "normal": "350.000", "promo": "290.000" }
                },
                "6 Hari": {
                    "Lunch": { "normal": "210.000", "promo": "175.000" },
                    "Dinner": { "normal": "210.000", "promo": "175.000" },
                    "Lunch & Dinner": { "normal": "420.000", "promo": "345.000" }
                },
                "10 Hari": {
                    "Lunch": { "normal": "350.000", "promo": "290.000" },
                    "Dinner": { "normal": "350.000", "promo": "290.000" },
                    "Lunch & Dinner": { "normal": "700.000", "promo": "570.000" }
                },
                "30 Hari": {
                    "Lunch": { "normal": "1.050.000", "promo": "860.000" },
                    "Dinner": { "normal": "1.050.000", "promo": "860.000" },
                    "Lunch & Dinner": { "normal": "2.100.000", "promo": "1.700.000" }
                }
            }
        },
        {
            "slug": "healthy-food",
            "category": "Healthy Food",
            "icon": "Salad",
            "description": "Pola makan seimbang dengan bahan berkualitas dan bernutrisi tinggi. Semakin mudah untuk menjaga pola hidup sehat.",
            "subscribers": 82,
            "pricing": {
                "5 Hari": {
                    "Lunch": { "normal": "180.000", "promo": "150.000" },
                    "Dinner": { "normal": "180.000", "promo": "150.000" },
                    "Lunch & Dinner": { "normal": "350.000", "promo": "290.000" }
                },
                "6 Hari": {
                    "Lunch": { "normal": "210.000", "promo": "175.000" },
                    "Dinner": { "normal": "210.000", "promo": "175.000" },
                    "Lunch & Dinner": { "normal": "420.000", "promo": "345.000" }
                },
                "10 Hari": {
                    "Lunch": { "normal": "350.000", "promo": "290.000" },
                    "Dinner": { "normal": "350.000", "promo": "290.000" },
                    "Lunch & Dinner": { "normal": "700.000", "promo": "570.000" }
                },
                "30 Hari": {
                    "Lunch": { "normal": "1.050.000", "promo": "860.000" },
                    "Dinner": { "normal": "1.050.000", "promo": "860.000" },
                    "Lunch & Dinner": { "normal": "2.100.000", "promo": "1.700.000" }
                }
            }
        },
        {
            "slug": "muscle-gain",
            "category": "Muscle Gain",
            "icon": "Dumbbell",
            "description": "Tinggi protein dan kalori optimal untuk mendukung hipertrofi otot dan recovery setelah latihan beban.",
            "subscribers": 15,
            "pricing": {
                "5 Hari": {
                    "Lunch": { "normal": "270.000", "promo": "225.000" },
                    "Dinner": { "normal": "270.000", "promo": "225.000" },
                    "Lunch & Dinner": { "normal": "520.000", "promo": "440.000" }
                },
                "6 Hari": {
                    "Lunch": { "normal": "320.000", "promo": "265.000" },
                    "Dinner": { "normal": "320.000", "promo": "265.000" },
                    "Lunch & Dinner": { "normal": "610.000", "promo": "520.000" }
                },
                "10 Hari": {
                    "Lunch": { "normal": "530.000", "promo": "440.000" },
                    "Dinner": { "normal": "530.000", "promo": "440.000" },
                    "Lunch & Dinner": { "normal": "1.050.000", "promo": "865.000" }
                },
                "30 Hari": {
                    "Lunch": { "normal": "1.600.000", "promo": "1.310.000" },
                    "Dinner": { "normal": "1.600.000", "promo": "1.310.000" },
                    "Lunch & Dinner": { "normal": "3.200.000", "promo": "2.590.000" }
                }
            }
        }
    ]
    
    result = collection.insert_many(packages)
    print(f"[OK] Berhasil seed {len(result.inserted_ids)} paket langganan")
    return result


def seed_featured_menus():
    """Seed data menu featured / andalan"""
    db = get_db()
    collection = db['featured_menus']
    
    # Hapus data lama
    collection.delete_many({})
    
    featured = [
        {
            "title": "Grilled Chicken Quinoa",
            "description": "Tinggi protein, sempurna untuk pembentukan otot. Dilengkapi sayuran organik panen lokal.",
            "calories": "450 kcal",
            "protein": "35g",
            "price": "Rp 55.000",
            "tags": ["High Protein", "Gluten Free"]
        },
        {
            "title": "Vegan Tofu Salad Bowl",
            "description": "Segar dan mengenyangkan. Paduan tahu sutra organik dengan dressing wijen sangrai pilihan.",
            "calories": "320 kcal",
            "protein": "15g",
            "price": "Rp 45.000",
            "tags": ["Vegan", "Low Calorie"]
        },
        {
            "title": "Keto Beef Broccoli",
            "description": "Sajian rendah karbohidrat dengan daging sapi premium grass-fed bebas lemak.",
            "calories": "520 kcal",
            "protein": "42g",
            "price": "Rp 70.000",
            "tags": ["Keto Friendly", "Low Carb"]
        }
    ]
    
    result = collection.insert_many(featured)
    print(f"[OK] Berhasil seed {len(result.inserted_ids)} featured menu")
    return result


def seed_dashboard_stats():
    """Seed data dashboard statistics"""
    db = get_db()
    collection = db['dashboard_stats']
    
    # Hapus data lama
    collection.delete_many({})
    
    stats = [
        { "name": "Total Aktif Pelanggan", "value": "142", "icon": "Users", "change": "+12%", "trend": "up" },
        { "name": "Katalog Menu Aktif", "value": "25", "icon": "Utensils", "change": "+2", "trend": "up" },
        { "name": "Jenis Paket Berlangganan", "value": "3", "icon": "Package", "change": "0", "trend": "neutral" },
        { "name": "Macam Bahan Baku", "value": "48", "icon": "Beef", "change": "-3%", "trend": "down" },
    ]
    
    result = collection.insert_many(stats)
    print(f"[OK] Berhasil seed {len(result.inserted_ids)} dashboard stats")
    return result


def seed_popular_menus():
    """Seed data menu terpopuler"""
    db = get_db()
    collection = db['popular_menus']
    
    # Hapus data lama
    collection.delete_many({})
    
    popular = [
        { "name": "Nasi Merah Ayam Madu", "category": "Lunch", "orders": 48 },
        { "name": "Fettucini Carbonara", "category": "Lunch", "orders": 32 },
        { "name": "Tropical Fruit Salad", "category": "Dinner", "orders": 29 },
    ]
    
    result = collection.insert_many(popular)
    print(f"[OK] Berhasil seed {len(result.inserted_ids)} popular menus")
    return result


def run_all_seeds():
    """Jalankan semua seed"""
    print("=" * 50)
    print("[SEED] Memulai proses seeding database Nutrilicious...")
    print("=" * 50)
    print()
    
    seed_materials()
    seed_menus()
    seed_packages()
    seed_featured_menus()
    seed_dashboard_stats()
    seed_popular_menus()
    
    print()
    print("=" * 50)
    print("[DONE] Semua data berhasil di-seed ke MongoDB!")
    print("   Database: nutrilicious_db")
    print("   Collections: materials, menus, packages,")
    print("                featured_menus, dashboard_stats, popular_menus")
    print("=" * 50)


if __name__ == '__main__':
    run_all_seeds()
