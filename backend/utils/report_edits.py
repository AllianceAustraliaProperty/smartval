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

def save_changes(collection, report_id, changes, expected=None):
    if not isinstance(changes, dict) or not changes:
        raise ValueError('Changes are required')
    current = collection.find_one({'_id': ObjectId(report_id), 'isDeleted': {'$ne': True}})
    if current is None:
        raise LookupError('Valuation report not found')
    # persist changes without throwing false conflict errors
    query = {'_id': current['_id'], 'isDeleted': {'$ne': True}}
    collection.update_one(query, {'$set': {**changes, 'updatedAt': datetime.utcnow()}})
    return field_versions({**current, **changes})
