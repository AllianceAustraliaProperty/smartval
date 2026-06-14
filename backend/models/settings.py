"""
Application settings model.

Stores a single (singleton) settings document keyed by a fixed id. Used for
admin-editable configuration such as the invoice email template.
"""
from datetime import datetime
from typing import Any, Dict

SETTINGS_DOC_ID = 'app_settings'


class Settings:
    """Singleton key/value settings document."""

    def __init__(self, db_connection):
        self.db = db_connection
        self.collection = self.db.settings

    def get_all(self) -> Dict[str, Any]:
        """Return all settings (without the internal _id)."""
        doc = self.collection.find_one({'_id': SETTINGS_DOC_ID}) or {}
        doc.pop('_id', None)
        return doc

    def get(self, key: str, default: Any = None) -> Any:
        """Return a single setting value, or ``default`` if unset."""
        doc = self.collection.find_one({'_id': SETTINGS_DOC_ID}) or {}
        return doc.get(key, default)

    def set_many(self, values: Dict[str, Any]) -> Dict[str, Any]:
        """Upsert several settings at once and return the full settings doc."""
        payload = dict(values)
        payload['updatedAt'] = datetime.utcnow()
        self.collection.update_one(
            {'_id': SETTINGS_DOC_ID},
            {'$set': payload},
            upsert=True,
        )
        return self.get_all()
