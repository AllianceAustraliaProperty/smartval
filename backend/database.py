"""
Database connection and configuration
"""
from pymongo import MongoClient
from config import Config


def get_database():
    """Get MongoDB database connection"""
    client = MongoClient(Config.MONGODB_URI)
    return client.get_default_database()


def get_valuation_reports_collection():
    """Get valuation reports collection"""
    db = get_database()
    return db.valuationReports