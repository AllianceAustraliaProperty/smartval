"""Idempotent deployment step: python ensure_performance_indexes.py."""
from database import get_database


if __name__ == '__main__':
    name = get_database().valuationReports.create_index(
        [('updatedAt', -1), ('_id', -1)], name='report_listing_updated_at'
    )
    print('Ready:', name)
