"""
API Routes untuk Transaksi (Orders/Transactions)
Termasuk integrasi Xendit Payment Gateway (Sandbox)
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from db import get_db
from datetime import datetime
import xendit
from xendit.apis import InvoiceApi
from xendit.invoice.model.create_invoice_request import CreateInvoiceRequest
from xendit.invoice.model.invoice_item import InvoiceItem
from routes.stock_deduction import deduct_stock_for_transaction, restore_stock_for_transaction

transactions_bp = Blueprint('transactions', __name__)


def get_xendit_client():
    """Initialize Xendit API client with secret key from config"""
    api_key = current_app.config.get('XENDIT_SECRET_KEY', '')
    if not api_key:
        raise ValueError("XENDIT_SECRET_KEY belum dikonfigurasi!")
    xendit.set_api_key(api_key)
    return xendit.ApiClient()


def normalize_xendit_status(status):
    value = getattr(status, 'value', status)
    value = str(value or '').upper()
    if '.' in value:
        value = value.rsplit('.', 1)[-1]
    return value


def serialize_transaction(txn):
    """Convert MongoDB document to JSON-serializable dict"""
    txn['_id'] = str(txn['_id'])
    # Convert datetime objects to ISO string
    if 'created_at' in txn and isinstance(txn['created_at'], datetime):
        txn['created_at'] = txn['created_at'].isoformat()
    if 'updated_at' in txn and isinstance(txn['updated_at'], datetime):
        txn['updated_at'] = txn['updated_at'].isoformat()
    return txn


def generate_order_id(db):
    """Generate unique order ID like NTR-20260506-001"""
    today = datetime.now().strftime('%Y%m%d')
    prefix = f"NTR-{today}-"
    
    # Find the latest order today
    latest = db['transactions'].find_one(
        {'order_id': {'$regex': f'^{prefix}'}},
        sort=[('order_id', -1)]
    )
    
    if latest:
        last_num = int(latest['order_id'].split('-')[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"{prefix}{new_num:03d}"


@transactions_bp.route('/', methods=['GET'])
def get_transactions():
    """Get transaksi dengan pagination, search, dan filter status"""
    db = get_db()
    
    query = {}
    
    # Filter status
    status = request.args.get('status')
    if status and status != 'all':
        query['status'] = status
    
    # Search by order_id, customer_name, or customer_phone
    search = request.args.get('search', '').strip()
    if search:
        query['$or'] = [
            {'order_id': {'$regex': search, '$options': 'i'}},
            {'customer_name': {'$regex': search, '$options': 'i'}},
            {'customer_phone': {'$regex': search, '$options': 'i'}},
        ]
    
    # Sort order
    sort_order = -1  # default: terbaru dulu
    if request.args.get('sort') == 'asc':
        sort_order = 1
    
    no_limit = request.args.get('no_limit') == 'true'
    total = db['transactions'].count_documents(query)
    
    if no_limit:
        transactions = list(
            db['transactions'].find(query)
            .sort('created_at', sort_order)
        )
        page = 1
        limit = total
        total_pages = 1
    else:
        # Pagination
        try:
            page = max(1, int(request.args.get('page', 1)))
        except (ValueError, TypeError):
            page = 1
        try:
            limit = min(100, max(1, int(request.args.get('limit', 15))))
        except (ValueError, TypeError):
            limit = 15
        
        total_pages = max(1, -(-total // limit))  # ceil division
        skip = (page - 1) * limit
        
        transactions = list(
            db['transactions'].find(query)
            .sort('created_at', sort_order)
            .skip(skip)
            .limit(limit)
        )
    
    return jsonify({
        'data': [serialize_transaction(t) for t in transactions],
        'total': total,
        'page': page,
        'limit': limit,
        'total_pages': total_pages,
    })


@transactions_bp.route('/<transaction_id>', methods=['GET'])
def get_transaction(transaction_id):
    """Get satu transaksi berdasarkan ID"""
    db = get_db()
    txn = db['transactions'].find_one({'_id': ObjectId(transaction_id)})
    if not txn:
        return jsonify({'error': 'Transaksi tidak ditemukan'}), 404
    return jsonify(serialize_transaction(txn))


@transactions_bp.route('/', methods=['POST'])
@jwt_required()
def create_transaction():
    """
    Buat transaksi baru dari checkout + buat Xendit Invoice.
    Response berisi invoice_url untuk redirect user ke halaman pembayaran.
    """
    db = get_db()
    data = request.get_json()
    user_id = get_jwt_identity()  # Ambil user_id dari JWT
    
    # Validasi field wajib
    required_fields = ['customer_name', 'customer_phone', 'items']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({'error': f'Field "{field}" wajib diisi'}), 400
    
    # Validasi items
    if not isinstance(data['items'], list) or len(data['items']) == 0:
        return jsonify({'error': 'Minimal harus ada 1 item dalam pesanan'}), 400
    
    # Hitung total
    total = 0
    items = []
    for item in data['items']:
        price = int(str(item.get('price', '0')).replace('.', ''))
        qty = int(item.get('quantity', 1))
        subtotal = price * qty
        total += subtotal
        items.append({
            'package_name': item.get('package_name', ''),
            'package_slug': item.get('package_slug', ''),
            'duration': item.get('duration', ''),
            'meal_type': item.get('meal_type', ''),
            'price': price,
            'quantity': qty,
            'subtotal': subtotal,
        })
    
    now = datetime.now()
    order_id = generate_order_id(db)
    
    txn = {
        'order_id': order_id,
        'user_id': user_id,
        'customer_name': data['customer_name'],
        'customer_phone': data['customer_phone'],
        'customer_address': data.get('customer_address', ''),
        'customer_lat': data.get('customer_lat', None),
        'customer_lng': data.get('customer_lng', None),
        'customer_notes': data.get('customer_notes', ''),
        'items': items,
        'total': total,
        'status': 'pending_payment',  # Status awal: menunggu pembayaran
        'payment_method': '',  # Akan diisi oleh Xendit setelah user memilih
        'payment_status': 'PENDING',
        'xendit_invoice_id': '',
        'xendit_invoice_url': '',
        'stock_deducted': False,  # Flag: apakah stok bahan baku sudah dikurangi
        'created_at': now,
        'updated_at': now,
    }
    
    result = db['transactions'].insert_one(txn)
    txn_id = str(result.inserted_id)
    txn['_id'] = txn_id
    
    # --- Buat Xendit Invoice ---
    try:
        xendit_client = get_xendit_client()
        invoice_api = InvoiceApi(xendit_client)
        
        # Buat items untuk invoice
        invoice_items = []
        for item in items:
            invoice_items.append(InvoiceItem(
                name=f"{item['package_name']} ({item['duration']} - {item['meal_type']})",
                quantity=float(item['quantity']),
                price=float(item['price']),
            ))
        
        # Frontend URL untuk redirect setelah bayar
        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:3000')
        
        invoice_request = CreateInvoiceRequest(
            external_id=order_id,
            amount=float(total),
            description=f"Pembayaran Nutrilicious - {order_id}",
            customer={
                "given_names": data['customer_name'],
                "mobile_number": data['customer_phone'],
            },
            items=invoice_items,
            currency="IDR",
            success_redirect_url=f"{frontend_url}/checkout/success?order_id={order_id}",
            failure_redirect_url=f"{frontend_url}/checkout/failed?order_id={order_id}",
        )
        
        invoice_response = invoice_api.create_invoice(
            create_invoice_request=invoice_request
        )
        
        # Update transaksi dengan data Xendit
        xendit_invoice_id = invoice_response.id
        xendit_invoice_url = invoice_response.invoice_url
        
        db['transactions'].update_one(
            {'_id': ObjectId(txn_id)},
            {'$set': {
                'xendit_invoice_id': xendit_invoice_id,
                'xendit_invoice_url': xendit_invoice_url,
            }}
        )
        
        txn['xendit_invoice_id'] = xendit_invoice_id
        txn['xendit_invoice_url'] = xendit_invoice_url
        txn['created_at'] = now.isoformat()
        txn['updated_at'] = now.isoformat()
        
        return jsonify(txn), 201
        
    except ValueError as e:
        # Xendit key belum dikonfigurasi - fallback ke mode tanpa payment gateway
        print(f"[WARNING] Xendit belum dikonfigurasi: {e}")
        txn['created_at'] = now.isoformat()
        txn['updated_at'] = now.isoformat()
        return jsonify(txn), 201
        
    except Exception as e:
        print(f"[ERROR] Gagal membuat Xendit Invoice: {e}")
        # Tetap simpan transaksi, tapi tanpa invoice
        txn['created_at'] = now.isoformat()
        txn['updated_at'] = now.isoformat()
        txn['payment_error'] = str(e)
        return jsonify(txn), 201


@transactions_bp.route('/xendit-webhook', methods=['POST'])
@transactions_bp.route('/webhook', methods=['POST'])
def xendit_webhook():
    """
    Webhook endpoint untuk menerima notifikasi dari Xendit.
    Xendit akan mengirim callback ketika status invoice berubah (PAID, EXPIRED, dll).
    """
    db = get_db()
    
    # Verifikasi webhook token dari header
    webhook_token = current_app.config.get('XENDIT_WEBHOOK_TOKEN', '')
    received_token = request.headers.get('x-callback-token', '')
    
    if webhook_token and received_token != webhook_token:
        return jsonify({'error': 'Invalid callback token'}), 403
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data received'}), 400
    
    external_id = data.get('external_id', '')  # Ini adalah order_id kita
    status = normalize_xendit_status(data.get('status', ''))
    payment_method = data.get('payment_method', '')
    payment_channel = data.get('payment_channel', '')
    paid_amount = data.get('paid_amount', 0)
    
    print(f"[WEBHOOK] Xendit: order={external_id}, status={status}, method={payment_method}")
    
    # Map Xendit status ke status internal kita
    status_map = {
        'PAID': 'confirmed',           # Pembayaran berhasil → confirmed
        'SETTLED': 'confirmed',         # Dana sudah masuk
        'EXPIRED': 'cancelled',         # Invoice expired → cancelled
    }
    
    new_status = status_map.get(status)
    if not new_status:
        # Status lain (PENDING, dll) - tidak perlu update
        return jsonify({'message': f'Status {status} acknowledged'}), 200
    
    # Update transaksi di database
    update_data = {
        'status': new_status,
        'payment_status': status,
        'payment_method': f"{payment_method} - {payment_channel}" if payment_channel else payment_method,
        'paid_amount': paid_amount,
        'updated_at': datetime.now(),
    }
    
    result = db['transactions'].update_one(
        {'order_id': external_id},
        {'$set': update_data}
    )
    
    if result.matched_count == 0:
        print(f"[WARNING] Transaksi dengan order_id {external_id} tidak ditemukan")
        return jsonify({'error': 'Transaction not found'}), 404
    
    # Auto-deduct stok bahan baku saat pembayaran dikonfirmasi
    if new_status == 'confirmed':
        txn = db['transactions'].find_one({'order_id': external_id})
        if txn and not txn.get('stock_deducted'):
            deduct_result = deduct_stock_for_transaction(db, txn)
            print(f"[STOCK] Webhook deduct untuk {external_id}: {deduct_result['deducted_count']} bahan dikurangi")
    
    print(f"[OK] Transaksi {external_id} diupdate ke status: {new_status}")
    return jsonify({'message': 'Webhook processed successfully'}), 200


@transactions_bp.route('/my-orders', methods=['GET'])
@jwt_required()
def get_user_transactions():
    """Get semua transaksi milik user yang sedang login (dari JWT)"""
    db = get_db()
    user_id = get_jwt_identity()
    
    query = {'user_id': user_id}
    status = request.args.get('status')
    if status:
        query['status'] = status
    
    transactions = list(
        db['transactions'].find(query).sort('created_at', -1)
    )
    return jsonify([serialize_transaction(t) for t in transactions])


@transactions_bp.route('/<transaction_id>/status', methods=['PUT'])
def update_transaction_status(transaction_id):
    """Update status transaksi"""
    db = get_db()
    data = request.get_json()
    
    valid_statuses = ['pending_payment', 'confirmed', 'processing', 'delivered', 'cancelled']
    new_status = data.get('status')
    
    if new_status not in valid_statuses:
        return jsonify({
            'error': f'Status tidak valid. Pilih: {", ".join(valid_statuses)}'
        }), 400
    
    # Ambil transaksi saat ini sebelum update (untuk cek status lama)
    txn_before = db['transactions'].find_one({'_id': ObjectId(transaction_id)})
    if not txn_before:
        return jsonify({'error': 'Transaksi tidak ditemukan'}), 404
    
    old_status = txn_before.get('status')
    
    result = db['transactions'].update_one(
        {'_id': ObjectId(transaction_id)},
        {'$set': {
            'status': new_status,
            'updated_at': datetime.now()
        }}
    )
    
    # Auto-deduct stok saat admin mengubah status ke confirmed
    if new_status == 'confirmed' and not txn_before.get('stock_deducted'):
        txn_updated = db['transactions'].find_one({'_id': ObjectId(transaction_id)})
        deduct_result = deduct_stock_for_transaction(db, txn_updated)
        print(f"[STOCK] Manual confirm deduct: {deduct_result['deducted_count']} bahan dikurangi")
    
    # Restore stok saat order yang sudah dikonfirmasi dibatalkan
    if new_status == 'cancelled' and txn_before.get('stock_deducted'):
        restore_result = restore_stock_for_transaction(db, txn_before)
        print(f"[STOCK] Cancel restore: {restore_result['restored_count']} bahan dikembalikan")
    
    updated = db['transactions'].find_one({'_id': ObjectId(transaction_id)})
    return jsonify(serialize_transaction(updated))


@transactions_bp.route('/<transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    """Hapus transaksi"""
    db = get_db()
    result = db['transactions'].delete_one({'_id': ObjectId(transaction_id)})
    
    if result.deleted_count == 0:
        return jsonify({'error': 'Transaksi tidak ditemukan'}), 404
    
    return jsonify({'message': 'Transaksi berhasil dihapus'}), 200


@transactions_bp.route('/check-status/<order_id>', methods=['GET'])
def check_payment_status(order_id):
    """
    Endpoint untuk frontend polling status pembayaran.
    Jika status masih pending_payment, akan aktif cek ke Xendit API sebagai fallback.
    """
    db = get_db()
    txn = db['transactions'].find_one({'order_id': order_id})
    if not txn:
        return jsonify({'error': 'Transaksi tidak ditemukan'}), 404
    
    # Jika masih pending_payment dan punya xendit_invoice_id, cek langsung ke Xendit
    if txn.get('status') == 'pending_payment' and txn.get('xendit_invoice_id'):
        try:
            xendit_client = get_xendit_client()
            invoice_api = InvoiceApi(xendit_client)
            invoice = invoice_api.get_invoice_by_id(invoice_id=txn['xendit_invoice_id'])
            
            xendit_status = normalize_xendit_status(invoice.status)
            
            status_map = {
                'PAID': 'confirmed',
                'SETTLED': 'confirmed',
                'EXPIRED': 'cancelled',
            }
            
            new_status = status_map.get(xendit_status)
            if new_status:
                # Update di database
                update_data = {
                    'status': new_status,
                    'payment_status': xendit_status,
                    'updated_at': datetime.now(),
                }
                
                # Ambil payment method jika ada
                if hasattr(invoice, 'payment_method') and invoice.payment_method:
                    update_data['payment_method'] = invoice.payment_method
                if hasattr(invoice, 'payment_channel') and invoice.payment_channel:
                    update_data['payment_method'] = f"{invoice.payment_method} - {invoice.payment_channel}"
                
                db['transactions'].update_one(
                    {'order_id': order_id},
                    {'$set': update_data}
                )
                
                print(f"[SYNC] Transaksi {order_id} disinkronkan dari Xendit: {xendit_status} -> {new_status}")
                
                # Auto-deduct stok saat payment disinkronkan ke confirmed
                if new_status == 'confirmed' and not txn.get('stock_deducted'):
                    txn_fresh = db['transactions'].find_one({'order_id': order_id})
                    deduct_result = deduct_stock_for_transaction(db, txn_fresh)
                    print(f"[STOCK] Sync deduct untuk {order_id}: {deduct_result['deducted_count']} bahan dikurangi")
                
                # Re-fetch updated transaction
                txn = db['transactions'].find_one({'order_id': order_id})
        except Exception as e:
            print(f"[WARNING] Gagal cek status Xendit untuk {order_id}: {e}")
    
    return jsonify(serialize_transaction(txn))


@transactions_bp.route('/stats', methods=['GET'])
def get_transaction_stats():
    """Get statistik transaksi untuk dashboard"""
    db = get_db()
    
    total = db['transactions'].count_documents({})
    pending = db['transactions'].count_documents({'status': 'pending_payment'})
    confirmed = db['transactions'].count_documents({'status': 'confirmed'})
    processing = db['transactions'].count_documents({'status': 'processing'})
    delivered = db['transactions'].count_documents({'status': 'delivered'})
    cancelled = db['transactions'].count_documents({'status': 'cancelled'})
    
    # Total revenue from delivered orders
    pipeline = [
        {'$match': {'status': {'$in': ['confirmed', 'processing', 'delivered']}}},
        {'$group': {'_id': None, 'total_revenue': {'$sum': '$total'}}}
    ]
    revenue_result = list(db['transactions'].aggregate(pipeline))
    total_revenue = revenue_result[0]['total_revenue'] if revenue_result else 0
    
    return jsonify({
        'total': total,
        'pending': pending,
        'confirmed': confirmed,
        'processing': processing,
        'delivered': delivered,
        'cancelled': cancelled,
        'total_revenue': total_revenue,
    })


@transactions_bp.route('/report', methods=['GET'])
def get_sales_report():
    """Get laporan penjualan dengan filter tanggal, status, dan paket"""
    db = get_db()
    
    query = {}
    
    # Filter tanggal
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    date_query = {}
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').replace(hour=0, minute=0, second=0)
            date_query['$gte'] = start_date
        except ValueError:
            pass
    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
            date_query['$lte'] = end_date
        except ValueError:
            pass
            
    if date_query:
        query['created_at'] = date_query
        
    # Filter status
    status = request.args.get('status', 'active')
    if status == 'active':
        # Default: hanya menghitung pesanan yang sukses/aktif (dikonfirmasi, diproses, terkirim)
        query['status'] = {'$in': ['confirmed', 'processing', 'delivered']}
    elif status != 'all':
        query['status'] = status
        
    # Filter paket katering
    package_slug = request.args.get('package_slug')
    if package_slug:
        query['items.package_slug'] = package_slug
        
    # Ambil data transaksi yang cocok
    transactions = list(db['transactions'].find(query).sort('created_at', 1))
    
    total_revenue = 0
    orders_count = len(transactions)
    total_items_sold = 0
    
    # Agregasi statistik paket terlaris
    package_stats = {}
    
    # Agregasi data harian
    daily_stats = {}
    
    for txn in transactions:
        txn_total = txn.get('total', 0)
        
        # Hitung kontribusi item
        txn_items_sold = 0
        matching_items_subtotal = 0
        
        for item in txn.get('items', []):
            item_slug = item.get('package_slug', '')
            item_name = item.get('package_name', '')
            item_price = item.get('price', 0)
            item_qty = item.get('quantity', 0)
            item_subtotal = item.get('subtotal', item_price * item_qty)
            
            if package_slug and item_slug != package_slug:
                continue
                
            total_items_sold += item_qty
            txn_items_sold += item_qty
            matching_items_subtotal += item_subtotal
            
            # Statistik paket
            if item_slug not in package_stats:
                package_stats[item_slug] = {
                    'package_slug': item_slug,
                    'package_name': item_name,
                    'quantity': 0,
                    'revenue': 0
                }
            package_stats[item_slug]['quantity'] += item_qty
            package_stats[item_slug]['revenue'] += item_subtotal
            
        # Tentukan nilai pendapatan untuk transaksi ini
        # Jika difilter per paket, kontribusi pendapatannya hanya subtotal paket tersebut
        revenue_contribution = matching_items_subtotal if package_slug else txn_total
        total_revenue += revenue_contribution
        
        # Kelompokkan per tanggal
        created_at = txn.get('created_at')
        if isinstance(created_at, datetime):
            date_key = created_at.strftime('%Y-%m-%d')
        else:
            date_key = str(created_at)[:10]
            
        if date_key not in daily_stats:
            daily_stats[date_key] = {
                'date': date_key,
                'revenue': 0,
                'count': 0
            }
        daily_stats[date_key]['revenue'] += revenue_contribution
        daily_stats[date_key]['count'] += 1
        
    # Urutkan paket terlaris berdasarkan pendapatan tertinggi
    top_packages = sorted(package_stats.values(), key=lambda x: x['revenue'], reverse=True)
    
    # Urutkan tren penjualan harian berdasarkan tanggal naik (kronologis)
    daily_sales = sorted(daily_stats.values(), key=lambda x: x['date'])
    
    return jsonify({
        'total_revenue': total_revenue,
        'orders_count': orders_count,
        'total_items_sold': total_items_sold,
        'average_order_value': int(total_revenue / orders_count) if orders_count > 0 else 0,
        'top_packages': top_packages,
        'daily_sales': daily_sales
    })
