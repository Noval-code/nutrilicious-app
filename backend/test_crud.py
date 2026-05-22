# -*- coding: utf-8 -*-
"""
Test Script: Admin CRUD Backend API
Menguji semua endpoint CRUD untuk Materials, Menus, Packages, Transactions, Dashboard
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import requests
import json

API = 'http://localhost:5000/api'

passed = 0
failed = 0

def test(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  [PASS] {name}")
    else:
        failed += 1
        print(f"  [FAIL] {name} -> {detail}")


def test_health():
    print("\n" + "=" * 55)
    print("  1. HEALTH CHECK")
    print("=" * 55)
    r = requests.get(f'{API}/health')
    test("GET /api/health returns 200", r.status_code == 200, f"got {r.status_code}")
    data = r.json()
    test("Response has status 'ok'", data.get('status') == 'ok', f"got {data}")


def test_materials():
    print("\n" + "=" * 55)
    print("  2. MATERIALS CRUD")
    print("=" * 55)

    # GET ALL
    r = requests.get(f'{API}/materials/')
    test("GET /materials/ returns 200", r.status_code == 200, f"got {r.status_code}")
    materials = r.json()
    test("GET /materials/ returns list", isinstance(materials, list), f"got {type(materials)}")
    initial_count = len(materials)
    print(f"     -> Total materials: {initial_count}")

    # SEARCH
    r = requests.get(f'{API}/materials/', params={'search': 'ayam'})
    test("GET /materials/?search=ayam returns 200", r.status_code == 200)
    search_results = r.json()
    test("Search results is list", isinstance(search_results, list))
    print(f"     -> Search 'ayam' found: {len(search_results)}")

    # CREATE
    new_data = {'name': 'Test Bahan Uji CRUD', 'unit': 'gram', 'stock': 999, 'min_stock': 100}
    r = requests.post(f'{API}/materials/', json=new_data)
    test("POST /materials/ returns 201", r.status_code == 201, f"got {r.status_code}")
    created = r.json()
    mat_id = created.get('_id', '')
    test("Created material has _id", bool(mat_id), f"got {created}")
    test("Created material name matches", created.get('name') == 'Test Bahan Uji CRUD')
    test("Created material stock matches", created.get('stock') == 999)

    # CREATE validation
    r = requests.post(f'{API}/materials/', json={'name': 'Incomplete'})
    test("POST missing fields returns 400", r.status_code == 400, f"got {r.status_code}")

    # GET BY ID
    r = requests.get(f'{API}/materials/{mat_id}')
    test("GET /materials/<id> returns 200", r.status_code == 200, f"got {r.status_code}")
    fetched = r.json()
    test("GET by ID returns correct name", fetched.get('name') == 'Test Bahan Uji CRUD')

    # GET BY ID - not found
    r = requests.get(f'{API}/materials/000000000000000000000000')
    test("GET /materials/<invalid_id> returns 404", r.status_code == 404, f"got {r.status_code}")

    # UPDATE
    r = requests.put(f'{API}/materials/{mat_id}', json={'name': 'Test Bahan Updated', 'stock': 1500})
    test("PUT /materials/<id> returns 200", r.status_code == 200, f"got {r.status_code}")
    updated = r.json()
    test("Updated name matches", updated.get('name') == 'Test Bahan Updated')
    test("Updated stock matches", updated.get('stock') == 1500)
    test("Unit unchanged", updated.get('unit') == 'gram')

    # UPDATE - not found
    r = requests.put(f'{API}/materials/000000000000000000000000', json={'name': 'x'})
    test("PUT /materials/<invalid_id> returns 404", r.status_code == 404, f"got {r.status_code}")

    # DELETE
    r = requests.delete(f'{API}/materials/{mat_id}')
    test("DELETE /materials/<id> returns 200", r.status_code == 200, f"got {r.status_code}")

    # DELETE - verify gone
    r = requests.get(f'{API}/materials/{mat_id}')
    test("Deleted material returns 404", r.status_code == 404, f"got {r.status_code}")

    # DELETE - not found
    r = requests.delete(f'{API}/materials/000000000000000000000000')
    test("DELETE /materials/<invalid_id> returns 404", r.status_code == 404, f"got {r.status_code}")

    # Verify count unchanged
    r = requests.get(f'{API}/materials/')
    test("Total count unchanged after create+delete", len(r.json()) == initial_count)


def test_menus():
    print("\n" + "=" * 55)
    print("  3. MENUS CRUD")
    print("=" * 55)

    # GET ALL
    r = requests.get(f'{API}/menus/')
    test("GET /menus/ returns 200", r.status_code == 200, f"got {r.status_code}")
    menus = r.json()
    test("GET /menus/ returns list", isinstance(menus, list))
    initial_count = len(menus)
    print(f"     -> Total menus: {initial_count}")

    # SEARCH + CATEGORY FILTER
    r = requests.get(f'{API}/menus/', params={'category': 'lunch'})
    test("GET /menus/?category=lunch returns 200", r.status_code == 200)
    lunch_menus = r.json()
    print(f"     -> Lunch menus: {len(lunch_menus)}")

    r = requests.get(f'{API}/menus/', params={'search': 'spaghetti'})
    test("GET /menus/?search=spaghetti returns 200", r.status_code == 200)
    search_results = r.json()
    print(f"     -> Search 'spaghetti' found: {len(search_results)}")

    # CREATE
    new_data = {'title': 'Test Menu CRUD', 'category': 'lunch', 'items': ['Nasi', 'Ayam', 'Sayur']}
    r = requests.post(f'{API}/menus/', json=new_data)
    test("POST /menus/ returns 201", r.status_code == 201, f"got {r.status_code}")
    created = r.json()
    menu_id = created.get('_id', '')
    test("Created menu has _id", bool(menu_id))
    test("Created menu title matches", created.get('title') == 'Test Menu CRUD')
    test("Created menu items count", len(created.get('items', [])) == 3)

    # CREATE validation
    r = requests.post(f'{API}/menus/', json={'title': 'Incomplete'})
    test("POST missing fields returns 400", r.status_code == 400, f"got {r.status_code}")

    # GET BY ID
    r = requests.get(f'{API}/menus/{menu_id}')
    test("GET /menus/<id> returns 200", r.status_code == 200, f"got {r.status_code}")

    # UPDATE
    r = requests.put(f'{API}/menus/{menu_id}', json={'title': 'Test Menu Updated', 'items': ['Nasi', 'Ikan']})
    test("PUT /menus/<id> returns 200", r.status_code == 200, f"got {r.status_code}")
    updated = r.json()
    test("Updated title matches", updated.get('title') == 'Test Menu Updated')
    test("Updated items count", len(updated.get('items', [])) == 2)
    test("Category unchanged", updated.get('category') == 'lunch')

    # DELETE
    r = requests.delete(f'{API}/menus/{menu_id}')
    test("DELETE /menus/<id> returns 200", r.status_code == 200, f"got {r.status_code}")

    # Verify count
    r = requests.get(f'{API}/menus/')
    test("Total count unchanged after create+delete", len(r.json()) == initial_count)


def test_packages():
    print("\n" + "=" * 55)
    print("  4. PACKAGES CRUD")
    print("=" * 55)

    # GET ALL
    r = requests.get(f'{API}/packages/')
    test("GET /packages/ returns 200", r.status_code == 200, f"got {r.status_code}")
    packages = r.json()
    test("GET /packages/ returns list", isinstance(packages, list))
    initial_count = len(packages)
    print(f"     -> Total packages: {initial_count}")

    # CREATE
    new_data = {
        'category': 'Test Package CRUD',
        'description': 'Paket uji coba',
        'pricing': {
            '5 Hari': {
                'Lunch': {'normal': '100.000', 'promo': '80.000'}
            }
        }
    }
    r = requests.post(f'{API}/packages/', json=new_data)
    test("POST /packages/ returns 201", r.status_code == 201, f"got {r.status_code}")
    created = r.json()
    pkg_id = created.get('_id', '')
    test("Created package has _id", bool(pkg_id))
    test("Created package category matches", created.get('category') == 'Test Package CRUD')
    test("Slug auto-generated", created.get('slug') == 'test-package-crud')

    # GET BY ID
    r = requests.get(f'{API}/packages/{pkg_id}')
    test("GET /packages/<id> returns 200", r.status_code == 200, f"got {r.status_code}")

    # UPDATE
    r = requests.put(f'{API}/packages/{pkg_id}', json={'category': 'Test Updated', 'description': 'Updated desc'})
    test("PUT /packages/<id> returns 200", r.status_code == 200, f"got {r.status_code}")
    updated = r.json()
    test("Updated category matches", updated.get('category') == 'Test Updated')
    test("Updated description matches", updated.get('description') == 'Updated desc')

    # DELETE
    r = requests.delete(f'{API}/packages/{pkg_id}')
    test("DELETE /packages/<id> returns 200", r.status_code == 200, f"got {r.status_code}")

    # Verify count
    r = requests.get(f'{API}/packages/')
    test("Total count unchanged after create+delete", len(r.json()) == initial_count)


def test_transactions():
    print("\n" + "=" * 55)
    print("  5. TRANSACTIONS")
    print("=" * 55)

    # GET ALL
    r = requests.get(f'{API}/transactions/')
    test("GET /transactions/ returns 200", r.status_code == 200, f"got {r.status_code}")
    txns = r.json()
    test("GET /transactions/ returns list", isinstance(txns, list))
    print(f"     -> Total transactions: {len(txns)}")

    # STATS
    r = requests.get(f'{API}/transactions/stats')
    test("GET /transactions/stats returns 200", r.status_code == 200, f"got {r.status_code}")
    stats = r.json()
    test("Stats has total field", 'total' in stats)
    test("Stats has total_revenue field", 'total_revenue' in stats)
    print(f"     -> Stats: total={stats.get('total')}, revenue={stats.get('total_revenue')}")

    # CREATE (without Xendit - will fallback)
    new_txn = {
        'customer_name': 'Test Customer CRUD',
        'customer_phone': '08123456789',
        'items': [
            {'package_name': 'Test Package', 'duration': '5 Hari', 'meal_type': 'Lunch', 'price': 150000, 'quantity': 1}
        ]
    }
    r = requests.post(f'{API}/transactions/', json=new_txn)
    test("POST /transactions/ returns 201", r.status_code == 201, f"got {r.status_code}")
    created = r.json()
    txn_id = created.get('_id', '')
    order_id = created.get('order_id', '')
    test("Created transaction has _id", bool(txn_id))
    test("Created transaction has order_id", bool(order_id))
    test("Order ID format NTR-YYYYMMDD-NNN", order_id.startswith('NTR-'))
    test("Status is pending_payment", created.get('status') == 'pending_payment')
    print(f"     -> Created order: {order_id}")

    # CREATE validation
    r = requests.post(f'{API}/transactions/', json={'customer_name': 'No Items'})
    test("POST missing fields returns 400", r.status_code == 400, f"got {r.status_code}")

    # GET BY ID
    r = requests.get(f'{API}/transactions/{txn_id}')
    test("GET /transactions/<id> returns 200", r.status_code == 200, f"got {r.status_code}")

    # UPDATE STATUS
    r = requests.put(f'{API}/transactions/{txn_id}/status', json={'status': 'confirmed'})
    test("PUT /transactions/<id>/status returns 200", r.status_code == 200, f"got {r.status_code}")
    updated = r.json()
    test("Status updated to confirmed", updated.get('status') == 'confirmed')

    # UPDATE STATUS - invalid
    r = requests.put(f'{API}/transactions/{txn_id}/status', json={'status': 'invalid_status'})
    test("PUT invalid status returns 400", r.status_code == 400, f"got {r.status_code}")

    # CHECK PAYMENT STATUS
    r = requests.get(f'{API}/transactions/check-status/{order_id}')
    test("GET /transactions/check-status/<order_id> returns 200", r.status_code == 200, f"got {r.status_code}")

    # USER TRANSACTIONS
    r = requests.get(f'{API}/transactions/user/test_clerk_id')
    test("GET /transactions/user/<clerk_id> returns 200", r.status_code == 200, f"got {r.status_code}")
    test("User transactions returns list", isinstance(r.json(), list))

    # DELETE
    r = requests.delete(f'{API}/transactions/{txn_id}')
    test("DELETE /transactions/<id> returns 200", r.status_code == 200, f"got {r.status_code}")


def test_dashboard():
    print("\n" + "=" * 55)
    print("  6. DASHBOARD")
    print("=" * 55)

    r = requests.get(f'{API}/dashboard/stats')
    test("GET /dashboard/stats returns 200", r.status_code == 200, f"got {r.status_code}")
    test("Dashboard stats is list", isinstance(r.json(), list))

    r = requests.get(f'{API}/dashboard/popular-menus')
    test("GET /dashboard/popular-menus returns 200", r.status_code == 200, f"got {r.status_code}")
    test("Popular menus is list", isinstance(r.json(), list))

    r = requests.get(f'{API}/dashboard/featured-menus')
    test("GET /dashboard/featured-menus returns 200", r.status_code == 200, f"got {r.status_code}")
    test("Featured menus is list", isinstance(r.json(), list))


def test_users():
    print("\n" + "=" * 55)
    print("  7. USERS")
    print("=" * 55)

    # GET user (new user)
    r = requests.get(f'{API}/users/test_clerk_new_user')
    test("GET /users/<clerk_id> returns 200", r.status_code == 200)
    data = r.json()
    test("New user has is_new flag", data.get('is_new') == True)

    # CREATE/UPDATE user
    user_data = {
        'name': 'Test User',
        'phone': '08111111111',
        'address': 'Jl. Test No. 1',
        'lat': -6.2,
        'lng': 106.8
    }
    r = requests.post(f'{API}/users/test_clerk_crud', json=user_data)
    test("POST /users/<clerk_id> returns 200", r.status_code == 200, f"got {r.status_code}")
    user = r.json()
    test("User name matches", user.get('name') == 'Test User')
    test("User address matches", user.get('address') == 'Jl. Test No. 1')

    # UPDATE user
    r = requests.put(f'{API}/users/test_clerk_crud', json={'name': 'Test User Updated', 'phone': '08222222222', 'address': 'Jl. Updated', 'lat': -6.3, 'lng': 106.9})
    test("PUT /users/<clerk_id> returns 200", r.status_code == 200, f"got {r.status_code}")
    updated = r.json()
    test("Updated name matches", updated.get('name') == 'Test User Updated')

    # GET updated user
    r = requests.get(f'{API}/users/test_clerk_crud')
    test("GET updated user returns 200", r.status_code == 200)
    test("Fetched user has updated name", r.json().get('name') == 'Test User Updated')


if __name__ == '__main__':
    print()
    print("*" * 55)
    print("  NUTRILICIOUS ADMIN BACKEND - CRUD TEST SUITE")
    print("*" * 55)

    try:
        test_health()
        test_materials()
        test_menus()
        test_packages()
        test_transactions()
        test_dashboard()
        test_users()
    except requests.ConnectionError:
        print("\n[ERROR] Cannot connect to backend. Is 'python app.py' running?")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
        import traceback
        traceback.print_exc()

    print()
    print("=" * 55)
    total = passed + failed
    print(f"  RESULTS: {passed}/{total} PASSED, {failed}/{total} FAILED")
    if failed == 0:
        print("  ALL TESTS PASSED!")
    else:
        print(f"  {failed} TEST(S) FAILED!")
    print("=" * 55)
    print()
