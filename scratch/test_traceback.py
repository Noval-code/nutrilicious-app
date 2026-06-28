import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import traceback
from app import create_app
from routes.transactions import get_sales_report

app = create_app()

with app.app_context():
    # Setup a mock request context
    with app.test_request_context('/api/transactions/report'):
        try:
            print("Executing get_sales_report()...")
            res = get_sales_report()
            print("Success:", res.get_json())
        except Exception as e:
            print("ERROR traceback:")
            traceback.print_exc()
