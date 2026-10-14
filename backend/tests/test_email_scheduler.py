"""Exercise scheduling cadence and failure handling without network or email."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch
from email_scheduler import Scheduler, healthy


class SchedulerTests(unittest.TestCase):
    def setUp(self):
        self.db = Mock()
        self.db.reportEmailSchedules.find_one_and_update.return_value = None
        self.transport = Mock()
        self.clock = 0
        self.health_path = Mock()
        self.worker = Scheduler(self.db, self.transport, self.health_path, lambda: self.clock)

    def test_full_idle_day_retains_polling_with_7800_database_calls(self):
        for second in range(0, 86400, 15):
            self.clock = second
            self.assertFalse(self.worker.tick())
        self.assertEqual(self.db.reportEmailSchedules.find_one_and_update.call_count, 5760)
        self.assertEqual(self.db.reportEmailSchedules.update_many.call_count, 576 + 24)
        self.assertEqual(self.db.reportEmailSchedulerState.update_one.call_count, 1440)
        self.transport.assert_not_called()

    def test_busy_worker_does_not_write_heartbeat_per_job(self):
        with patch('utils.email_schedule.run_once', return_value=True):
            for second in range(61):
                self.clock = second
                self.assertTrue(self.worker.tick())
        self.assertEqual(self.db.reportEmailSchedulerState.update_one.call_count, 2)
        self.assertEqual(self.db.reportEmailSchedules.update_many.call_count, 3)

    def test_recovery_runs_at_startup_and_five_minutes(self):
        with patch('utils.email_schedule.recover_expired_jobs') as recover:
            for second in (0, 15, 60, 299):
                self.clock = second
                self.worker.tick()
            self.assertEqual(recover.call_count, 1)
            self.clock = 300
            self.worker.tick()
            self.assertEqual(recover.call_count, 2)

    def test_failed_recovery_is_retried_and_does_not_publish_health(self):
        with patch('utils.email_schedule.recover_expired_jobs', side_effect=[RuntimeError(), None]) as recover:
            with self.assertRaises(RuntimeError): self.worker.tick()
            self.health_path.with_suffix.assert_not_called()
            self.db.reportEmailSchedules.find_one_and_update.assert_not_called()
            self.clock = 15
            self.worker.tick()
            self.assertEqual(recover.call_count, 2)

    def test_failed_heartbeat_is_retried_and_does_not_publish_health(self):
        self.db.reportEmailSchedulerState.update_one.side_effect = [RuntimeError(), None]
        with self.assertRaises(RuntimeError): self.worker.tick()
        self.health_path.with_suffix.assert_not_called()
        self.clock = 15
        self.worker.tick()
        self.assertEqual(self.db.reportEmailSchedulerState.update_one.call_count, 2)
        self.assertEqual(self.worker.next_heartbeat, 75)

    def test_failed_poll_does_not_refresh_health(self):
        self.db.reportEmailSchedules.find_one_and_update.side_effect = RuntimeError()
        with self.assertRaises(RuntimeError): self.worker.tick()
        self.db.reportEmailSchedulerState.update_one.assert_not_called()
        self.health_path.with_suffix.assert_not_called()

    def test_local_health_refreshes_between_database_heartbeats(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'health.json'
            worker = Scheduler(self.db, self.transport, path, lambda: self.clock)
            with patch('email_scheduler.time.time', return_value=100): worker.tick()
            self.clock = 15
            with patch('email_scheduler.time.time', return_value=115): worker.tick()
            self.assertEqual(json.loads(path.read_text())['at'], 115)
            self.assertFalse(path.with_suffix('.tmp').exists())
            self.assertEqual(self.db.reportEmailSchedulerState.update_one.call_count, 1)

    def test_health_threshold_missing_invalid_and_future_timestamps(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'health.json'
            self.assertFalse(healthy(path, 1000))
            for contents, expected in [('bad', False), ('{}', False), ('{"at": null}', False),
                                       ('{"at": 1001}', False), ('{"at": 821}', True), ('{"at": 820}', False)]:
                path.write_text(contents)
                self.assertEqual(healthy(path, 1000), expected, contents)


if __name__ == '__main__': unittest.main()
