"""Rename packages.category to packages.name.

Run once after deploying the code that uses packages.name:
    python backend/migrations/migrate_packages_category_to_name.py
"""

from pathlib import Path
import sys

from dotenv import load_dotenv

backend_dir = Path(__file__).resolve().parents[1]
load_dotenv(backend_dir / '.env')
sys.path.append(str(backend_dir))

from db import get_db


def main():
    db = get_db()
    packages = db['packages']

    copied = packages.update_many(
        {'name': {'$exists': False}, 'category': {'$exists': True}},
        [{'$set': {'name': '$category'}}],
    )
    removed = packages.update_many(
        {'category': {'$exists': True}},
        {'$unset': {'category': ''}},
    )

    print(f"Copied category to name: {copied.modified_count}")
    print(f"Removed category field: {removed.modified_count}")


if __name__ == '__main__':
    main()
