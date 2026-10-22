"""Synthetic records only. No network or production mail is used."""
import unittest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from bson import ObjectId
import mongomock
from flask import Flask, request
from utils.email_schedule import now, send_time, addresses, ensure_indexes, run_once, fingerprint, recover_expired_jobs
from blueprints.email_schedules import email_schedules_bp


class ScheduleTests(unittest.TestCase):
    def setUp(self):
        self.db = mongomock.MongoClient().test
        self.collection = self.db.reportEmailSchedules
        ensure_indexes(self.collection)
        self.report = {'_id': ObjectId(), 'primaryContact': {'email': 'client@example.com'}}
        self.db.valuationReports.insert_one(self.report)
        self.job = {'_id': 'test-job', 'reportId': str(self.report['_id']), 'createdBy': 'creator',
            'status': 'scheduled', 'active': True, 'version': 1, 'attempts': 0,
            'createdAt': now(), 'updatedAt': now(), 'scheduledAt': now() - timedelta(seconds=1),
            'nextAttemptAt': now() - timedelta(seconds=1), 'to': ['client@example.com'], 'cc': [],
            'sender': 'sender@example.com', 'subject': 'Synthetic report', 'html': '<p>Test</p>',
            'filename': 'test.pdf', 'pdf': b'%PDF-test', 'fingerprint': fingerprint(self.report), 'events': []}
        app = Flask(__name__)
        @app.before_request
        def auth(): request.user = {'uid': request.headers.get('X-Test-User', 'creator')}
        app.register_blueprint(email_schedules_bp, url_prefix='/api/valuation-reports')
        self.client = app.test_client()
        self.db_patch = patch('blueprints.email_schedules.get_database', return_value=self.db)
        self.db_patch.start(); self.addCleanup(self.db_patch.stop)
        self.path = f'/api/valuation-reports/{self.report["_id"]}/email-schedules/test-job/'

    def add(self, **fields):
        self.job.update(fields); self.collection.insert_one(self.job)

    def test_daylight_saving(self):
        reference = datetime(2026, 1, 1)
        self.assertEqual(send_time('2026-10-05T09:00', 'Australia/Sydney', reference), datetime(2026, 10, 4, 22))
        for date in ('2026-10-04T02:30', '2026-04-05T02:30'):
            with self.assertRaises(ValueError): send_time(date, 'Australia/Sydney', reference)

    def test_past_and_unknown_zone(self):
        for date, zone in [('2000-01-01T09:00', 'UTC'), ('2026-10-15T09:00', 'invalid')]:
            with self.assertRaises(ValueError): send_time(date, zone)

    def test_recipient_validation(self):
        self.assertEqual(addresses('A@example.com, a@example.com'), ['a@example.com'])
        for value in ('bad', 'a@example.com\r\nBcc: bad@example.com', ''):
            with self.assertRaises(ValueError): addresses(value, True)

    def test_duplicate_active_report_blocked(self):
        from pymongo.errors import DuplicateKeyError
        self.add()
        with self.assertRaises(DuplicateKeyError): self.collection.insert_one({**self.job, '_id': 'second'})

    def test_send_only_once(self):
        self.add()
        transport = Mock(side_effect=lambda **kwargs: kwargs['before_send']())
        run_once(self.db, transport); run_once(self.db, transport)
        self.assertEqual(transport.call_count, 1)
        self.assertEqual(self.collection.find_one()['status'], 'accepted')
        self.assertFalse(self.collection.find_one()['active'])

    def test_uncertain_send_not_retried(self):
        self.add()
        def failure(**kwargs):
            kwargs['before_send'](); raise TimeoutError()
        transport = Mock(side_effect=failure)
        run_once(self.db, transport); run_once(self.db, transport)
        self.assertEqual(transport.call_count, 1)
        self.assertEqual(self.collection.find_one()['status'], 'needs_review')

    def test_auth_failure_is_terminal_not_sending(self):
        self.add(); run_once(self.db, Mock(side_effect=RuntimeError('token unavailable')))
        self.assertEqual(self.collection.find_one()['status'], 'failed')

    def test_crashed_send_requires_review(self):
        self.add(status='sending', leaseUntil=now() - timedelta(seconds=1))
        transport = Mock(); recover_expired_jobs(self.db); run_once(self.db, transport)
        transport.assert_not_called()
        self.assertEqual(self.collection.find_one()['status'], 'needs_review')

    def test_crash_before_send_can_recover(self):
        self.add(status='processing', leaseUntil=now() - timedelta(seconds=1))
        recover_expired_jobs(self.db)
        transport = Mock(side_effect=lambda **kwargs: kwargs['before_send']())
        run_once(self.db, transport)
        self.assertEqual(self.collection.find_one()['status'], 'accepted')

    def test_overdue_or_deleted_not_sent(self):
        for deleted in (False, True):
            with self.subTest(deleted=deleted):
                self.collection.delete_many({})
                self.add(scheduledAt=now() - timedelta(hours=2) if not deleted else now())
                self.db.valuationReports.update_one({'_id': self.report['_id']}, {'$set': {'isDeleted': deleted}})
                transport = Mock(); run_once(self.db, transport); transport.assert_not_called()
                self.assertEqual(self.collection.find_one()['status'], 'needs_review')

    def test_owner_and_version_enforced(self):
        self.add()
        self.assertEqual(self.client.post(self.path + 'cancel', json={'version': 1}, headers={'X-Test-User': 'other'}).status_code, 403)
        self.assertEqual(self.client.post(self.path + 'cancel', json={'version': 0}).status_code, 409)
        self.assertEqual(self.client.post(self.path + 'cancel', json={'version': 1}).status_code, 200)
        transport = Mock(); run_once(self.db, transport); transport.assert_not_called()

    def test_confirmation_removes_preview_expiry(self):
        self.add(status='prepared', active=False, expiresAt=now() + timedelta(minutes=20))
        result = self.client.post(self.path + 'confirm', json={'version': 1, 'localDateTime': (now() + timedelta(days=1)).strftime('%Y-%m-%dT%H:%M'), 'timeZone': 'UTC'})
        self.assertEqual(result.status_code, 200, result.json)
        self.assertNotIn('expiresAt', self.collection.find_one())
        self.assertTrue(self.collection.find_one()['active'])

    def test_changed_report_cannot_be_confirmed(self):
        self.add(status='prepared', active=False, expiresAt=now() + timedelta(minutes=20))
        self.db.valuationReports.update_one({'_id': self.report['_id']}, {'$set': {'fileNumber': 'changed'}})
        self.assertEqual(self.client.post(self.path + 'confirm', json={'version': 1}).status_code, 400)

    def test_uncertain_close_requires_acknowledgment(self):
        self.add(status='needs_review')
        self.assertEqual(self.client.post(self.path + 'cancel', json={'version': 1}).status_code, 400)
        self.assertEqual(self.client.post(self.path + 'cancel', json={'version': 1, 'reviewed': True}).status_code, 200)

    def test_sending_cannot_be_cancelled(self):
        self.add(status='sending')
        self.assertEqual(self.client.post(self.path + 'cancel', json={'version': 1}).status_code, 400)

    def test_cross_origin_mutation_blocked(self):
        self.add()
        self.assertEqual(self.client.post(self.path + 'cancel', json={'version': 1}, headers={'Origin': 'https://untrusted.example'}).status_code, 403)

    def test_listing_omits_private_payload_and_identifies_changes(self):
        self.add()
        result = self.client.get(self.path.rsplit('/', 2)[0])
        self.assertEqual(result.status_code, 200)
        self.assertNotIn('pdf', result.json['jobs'][0]); self.assertNotIn('html', result.json['jobs'][0])
        self.assertFalse(result.json['jobs'][0]['reportChanged'])

    def test_worker_health_allows_three_minutes_but_rejects_stale_or_future(self):
        reference = now()
        for age, expected in [(0, True), (119, True), (179, True), (180, False), (240, False), (-1, False)]:
            self.db.reportEmailSchedulerState.update_one({'_id': 'worker'},
                {'$set': {'at': reference - timedelta(seconds=age)}}, upsert=True)
            with patch('blueprints.email_schedules.now', return_value=reference):
                result = self.client.get(self.path.rsplit('/', 2)[0])
            self.assertEqual(result.json['workerHealthy'], expected, age)

    def test_reschedule_preserves_approved_payload(self):
        self.add()
        result = self.client.post(self.path + 'reschedule', json={'version': 1, 'localDateTime': (now() + timedelta(days=1)).strftime('%Y-%m-%dT%H:%M'), 'timeZone': 'UTC'})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(self.collection.find_one()['pdf'], b'%PDF-test')
        self.assertGreater(self.collection.find_one()['scheduledAt'], now())

    def test_unconfirmed_preview_never_sends(self):
        self.add(status='prepared', active=False)
        transport = Mock(); run_once(self.db, transport); transport.assert_not_called()

    def test_graph_send_boundary_follows_authentication(self):
        from utils.graph_mail import send_mail
        events = []
        with patch('utils.graph_mail._get_access_token', side_effect=lambda: events.append('token') or 'fake'), patch('utils.graph_mail.requests.post', side_effect=lambda *args, **kwargs: events.append('post') or Mock(status_code=202)):
            send_mail('client@example.com', 'Test', '<p>Test</p>', sender='sender@example.com', before_send=lambda: events.append('boundary'))
        self.assertEqual(events, ['token', 'boundary', 'post'])

    def test_concurrent_worker_claims_submit_only_once(self):
        from concurrent.futures import ThreadPoolExecutor
        self.add()
        transport = Mock(side_effect=lambda **kwargs: kwargs['before_send']())
        with ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(lambda _: run_once(self.db, transport), range(2)))
        self.assertEqual(transport.call_count, 1)

    def test_prepare_snapshots_and_is_idempotent(self):
        from uuid import uuid4
        with patch('blueprints.valuation_reports._render_html_report', return_value=('<html/>', True, None)), patch('utils.pdf_client.generate_pdf_from_html', return_value=b'%PDF-snapshot'):
            self.db.settings.insert_one({'_id': 'app_settings', 'reportEmailSender': 'sender@example.com'})
            path = self.path.rsplit('/', 2)[0] + '/prepare'
            body = {'requestId': str(uuid4()), 'to': 'client@example.com', 'cc': ''}
            first = self.client.post(path, json=body)
            self.assertEqual(first.status_code, 200, first.json)
            second = self.client.post(path, json=body)
            self.assertEqual(second.json['job']['id'], first.json['job']['id'])
            self.assertEqual(self.collection.count_documents({}), 1)
            self.assertEqual(bytes(self.collection.find_one()['pdf']), b'%PDF-snapshot')
            self.assertFalse(self.collection.find_one()['active'])

    def test_oversized_pdf_is_not_stored_or_scheduled(self):
        from uuid import uuid4
        with patch('blueprints.valuation_reports._render_html_report', return_value=('<html/>', True, None)), patch('utils.pdf_client.generate_pdf_from_html', return_value=b'x' * 2_500_001):
            self.db.settings.insert_one({'_id': 'app_settings', 'reportEmailSender': 'sender@example.com'})
            result = self.client.post(self.path.rsplit('/', 2)[0] + '/prepare', json={'requestId': str(uuid4()), 'to': 'client@example.com', 'cc': ''})
            self.assertEqual(result.status_code, 400)
            self.assertEqual(self.collection.count_documents({}), 0)


if __name__ == '__main__': unittest.main()
