"""
Database connection — one shared MongoClient for the whole process.
SRV resolution on `mongodb+srv://...` URIs is eager and slow (1-3s on Atlas),
so before this consolidation each of the ~10 blueprints that called
`MongoClient(...)` at module load paid that cost separately. Now there's one.
"""
from pymongo import MongoClient
from config import Config

_client = None
_db = None


def get_database():
    """Return the cached default database, lazily creating MongoClient on first call."""
    global _client, _db
    if _db is None:
        _client = MongoClient(Config.MONGODB_URI, connect=False)
        _db = _client.get_default_database()
    return _db


def get_valuation_reports_collection():
    """Get valuation reports collection"""
    return get_database().valuationReports