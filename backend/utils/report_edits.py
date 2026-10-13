"""Field versions and atomic compare-and-set for report editor saves."""
import hashlib
from datetime import datetime
from bson import ObjectId, json_util

EDIT_FIELDS = frozenset(('address', 'rpDataId', 'rpData', 'fileNumber', 'allianceId',
    'primaryContact', 'propertyDetails', 'locationDetails', 'propertyDescriptors',
    'ancillaryImprovements', 'generalComments', 'valuationDetails', 'referralDetails',
    'invoiceDetails', 'photos', 'additionalPhotos', 'additionalPhotosType', 'floorPlans',
    'titleSearch', 'comparables'))

class EditConflict(Exception):
    pass

def clean_nulls(value):
    """Preserve empty arrays/objects: users must be able to clear a field."""
    if isinstance(value, dict):
        return {key: clean_nulls(item) for key, item in value.items() if item is not None}
    if isinstance(value, list):
        return [clean_nulls(item) for item in value if item is not None]
    return value

def field_version(report, field):
    value = {'exists': field in report, 'value': report.get(field)}
    return hashlib.sha256(json_util.dumps(value, sort_keys=True).encode()).hexdigest()

def field_versions(report):
    return {key: field_version(report, key) for key in EDIT_FIELDS}

def save_changes(collection, report_id, changes, expected):
    if not isinstance(changes, dict) or not isinstance(expected, dict) or not changes:
        raise ValueError('Changes and field versions are required')
    if not set(changes).issubset(EDIT_FIELDS) or set(changes) != set(expected):
        raise ValueError('Invalid report fields or missing field versions')
    current = collection.find_one({'_id': ObjectId(report_id), 'isDeleted': {'$ne': True}})
    if current is None:
        raise LookupError('Valuation report not found')
    query = {'_id': current['_id'], 'isDeleted': {'$ne': True}}
    for field, value in changes.items():
        # A completed photo autosave (or retry after a lost response) may already
        # have stored this exact value. That is safe and needs no overwrite.
        if field_version(current, field) != expected[field] and clean_nulls(current.get(field)) != value:
            raise EditConflict('This report changed elsewhere. Your edits are still here. Download your draft before reloading and comparing the latest report.')
        query[field] = {'$eq': current[field]} if field in current else {'$exists': False}
    result = collection.update_one(query, {'$set': {**changes, 'updatedAt': datetime.utcnow()}})
    if not result.matched_count:
        raise EditConflict('This report changed while saving. Your edits are still here. Please retry; if the conflict remains, download your draft before reloading.')
    return field_versions({**current, **changes})
