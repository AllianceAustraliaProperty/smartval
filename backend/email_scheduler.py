"""Separate bounded worker; its health check never sends an email."""
import json
import os
from pathlib import Path
import sys
import time
from utils.email_schedule_timing import (
    POLL_INTERVAL, HEARTBEAT_INTERVAL, RECOVERY_INTERVAL, CLEANUP_INTERVAL, HEALTH_MAX_AGE,
)

HEALTH = Path('/tmp/email-scheduler-health.json')


def healthy(path=HEALTH, timestamp=None):
    try:
        age = (time.time() if timestamp is None else timestamp) - json.loads(path.read_text())['at']
        return 0 <= age < HEALTH_MAX_AGE
    except (OSError, ValueError, KeyError, TypeError):
        return False


class Scheduler:
    """Poll due jobs frequently; throttle maintenance independently of job traffic."""
    def __init__(self, db, transport, health_path=HEALTH, clock=time.monotonic):
        self.db = db
        self.transport = transport
        self.health_path = health_path
        self.clock = clock
        self.next_recovery = self.next_cleanup = self.next_heartbeat = 0

    def tick(self):
        from datetime import timedelta
        from utils.email_schedule import recover_expired_jobs, run_once, now
        if self.clock() >= self.next_recovery:
            recover_expired_jobs(self.db)
            self.next_recovery = self.clock() + RECOVERY_INTERVAL
        processed = run_once(self.db, self.transport)
        if self.clock() >= self.next_cleanup:
            self.db.reportEmailSchedules.update_many(
                {'active': False, 'status': {'$in': ['accepted', 'cancelled', 'failed']},
                 'updatedAt': {'$lt': now() - timedelta(days=30)}, 'pdf': {'$exists': True}},
                {'$unset': {'pdf': '', 'html': ''}})
            self.next_cleanup = self.clock() + CLEANUP_INTERVAL
        if self.clock() >= self.next_heartbeat:
            self.db.reportEmailSchedulerState.update_one(
                {'_id': 'worker'}, {'$set': {'at': now()}}, upsert=True)
            self.next_heartbeat = self.clock() + HEARTBEAT_INTERVAL
        # Refresh local health only after a successful cycle. Replace atomically
        # so Docker cannot read a partially written timestamp.
        temporary = self.health_path.with_suffix('.tmp')
        temporary.write_text(json.dumps({'at': time.time()}))
        temporary.replace(self.health_path)
        return processed


if __name__ == '__main__':
    if '--healthcheck' in sys.argv:
        sys.exit(0 if healthy() else 1)
    if os.environ.get('SCHEDULED_EMAILS_ENABLED') != 'true':
        raise SystemExit('Scheduled email worker is disabled')
    from database import get_database
    from utils.email_schedule import ensure_indexes
    from utils.graph_mail import send_mail
    db = get_database()
    ensure_indexes(db.reportEmailSchedules)
    scheduler = Scheduler(db, send_mail)
    while True:
        processed = False
        try:
            processed = scheduler.tick()
        except Exception as exc:
            print('Email scheduler cycle failed: ' + type(exc).__name__, flush=True)
        time.sleep(1 if processed else POLL_INTERVAL)
