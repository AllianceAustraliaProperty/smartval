import copy
import unittest
from types import SimpleNamespace
from bson import ObjectId
from utils.report_edits import save_changes, field_versions, clean_nulls, EditConflict

class Collection:
    def __init__(self, data): self.data = copy.deepcopy(data); self.race = False
    def find_one(self, query): return copy.deepcopy(self.data)
    def update_one(self, query, update):
        if self.race: return SimpleNamespace(matched_count=0)
        for key, match in query.items():
            if key in ('_id', 'isDeleted'): continue
            if '$eq' in match: assert self.data[key] == match['$eq']
            else: assert key not in self.data
        self.data.update(copy.deepcopy(update['$set']))
        return SimpleNamespace(matched_count=1)

class EditTests(unittest.TestCase):
    def setUp(self):
        self.data = {'_id': ObjectId(), 'address': {'suburb':'old'}, 'generalComments': {'text':'old'}, 'photos':[]}
        self.db = Collection(self.data)
        self.versions = field_versions(self.data)
    def save(self, changes):
        return save_changes(self.db, str(self.data['_id']), changes, {key:self.versions[key] for key in changes})
    def test_changed_fields_preserve_other_users_changes(self):
        self.db.data['generalComments'] = {'text':'other user'}
        self.save({'address': {'suburb':'new'}})
        self.assertEqual(self.db.data['generalComments']['text'], 'other user')
    def test_stale_same_field_rejected_without_write(self):
        self.db.data['address'] = {'suburb':'other user'}
        before = copy.deepcopy(self.db.data)
        with self.assertRaises(EditConflict): self.save({'address':{'suburb':'mine'}})
        self.assertEqual(self.db.data, before)
    def test_race_between_read_and_write_is_rejected(self):
        self.db.race = True
        with self.assertRaises(EditConflict): self.save({'address':{'suburb':'mine'}})
    def test_own_autosave_and_lost_response_retry_are_safe(self):
        self.db.data['photos'] = [{'photoUrl':None,'category':'new'}]
        self.save({'photos':[{'category':'new'}]})
        self.assertEqual(self.db.data['photos'], [{'category':'new'}])
    def test_empty_arrays_are_saved(self):
        self.db.data['photos'] = [{'category':'old'}]
        self.versions = field_versions(self.db.data)
        self.save(clean_nulls({'photos':[]}))
        self.assertEqual(self.db.data['photos'], [])
    def test_missing_field_has_distinct_version_and_atomic_guard(self):
        self.save({'fileNumber':'new'})
        self.assertEqual(self.db.data['fileNumber'], 'new')
    def test_invalid_fields_and_missing_versions_rejected(self):
        with self.assertRaises(ValueError): save_changes(self.db, str(self.data['_id']), {'isDeleted':True}, {'isDeleted':'x'})
        with self.assertRaises(ValueError): save_changes(self.db, str(self.data['_id']), {'address':{}}, {})
    def test_new_versions_match_saved_data(self):
        versions = self.save({'address':{'suburb':'new'}})
        self.assertEqual(versions, field_versions(self.db.data))

class RouteTests(EditTests):
    def test_patch_route_and_conflict_status(self):
        from flask import Flask
        from unittest.mock import patch
        from blueprints import valuation_reports as routes
        app = Flask(__name__)
        app.register_blueprint(routes.valuation_reports_bp)
        with patch.object(routes, 'valuation_report_model', SimpleNamespace(collection=self.db)):
            client = app.test_client()
            response = client.patch('/'+str(self.data['_id']), json={'changes':{'address':{'suburb':'new'}},'expected':{'address':self.versions['address']}})
            self.assertEqual(response.status_code, 200)
            self.assertIn('fieldVersions',response.json)
            response = client.patch('/'+str(self.data['_id']), json={'changes':{'address':{'suburb':'stale'}},'expected':{'address':self.versions['address']}})
            self.assertEqual(response.status_code, 409)
            self.assertEqual(self.db.data['address']['suburb'],'new')

if __name__ == '__main__': unittest.main()
