"""Separate bounded worker; its health check never sends an email."""
import json
import os
from pathlib import Path
import sys
import time

HEALTH = Path('/tmp/email-scheduler-health.json')

if __name__ == '__main__':
    if '--healthcheck' in sys.argv:
        try:
            sys.exit(0 if time.time() - json.loads(HEALTH.read_text())['at'] < 120 else 1)
        except (OSError, ValueError, KeyError):
            sys.exit(1)
    if os.environ.get('SCHEDULED_EMAILS_ENABLED') != 'true':
        raise SystemExit('Scheduled email worker is disabled')
    from database import get_database
    from utils.email_schedule import ensure_indexes, run_once, now
    from utils.graph_mail import send_mail
    from datetime import timedelta
    db = get_database()
    ensure_indexes(db.reportEmailSchedules)
    next_cleanup = 0
    while True:
        processed = False
        try:
            processed = run_once(db, send_mail)
            if time.monotonic() >= next_cleanup:
                db.reportEmailSchedules.update_many({'active': False, 'status': {'$in': ['accepted', 'cancelled', 'failed']},
                    'updatedAt': {'$lt': now() - timedelta(days=30)}, 'pdf': {'$exists': True}}, {'$unset': {'pdf': '', 'html': ''}})
                next_cleanup = time.monotonic() + 3600
            db.reportEmailSchedulerState.update_one({'_id': 'worker'}, {'$set': {'at': now()}}, upsert=True)
            HEALTH.write_text(json.dumps({'at': time.time()}))
        except Exception as exc:
            print('Email scheduler cycle failed: ' + type(exc).__name__, flush=True)
        time.sleep(1 if processed else 15)
