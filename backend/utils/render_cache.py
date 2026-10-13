"""Bounded, short-lived cache shared by the Linux Gunicorn workers.

Keys are hashes, files are private, and cache failures never break a report.
The cache lives in /tmp and disappears on deployment/restart.
"""
import hashlib
import logging
import os
from pathlib import Path
import tempfile
import time
import fcntl
from contextlib import contextmanager

log = logging.getLogger(__name__)


class RenderCache:
    def __init__(self, namespace, ttl=300, max_bytes=64 * 1024 * 1024, root=None):
        self.path = Path(root or os.environ.get('RENDER_CACHE_DIR', '/tmp/smartval-cache')) / namespace
        self.ttl = ttl
        self.max_bytes = max_bytes

    @staticmethod
    def digest(key):
        return hashlib.sha256(key.encode('utf-8') if isinstance(key, str) else key).hexdigest()

    def get(self, key):
        try:
            target = self.path / (self.digest(key) + '.cache')
            if time.time() - target.stat().st_mtime < self.ttl:
                return target.read_bytes()
        except OSError:
            pass
        return None

    def put(self, key, value):
        if len(value) > self.max_bytes // 2:
            return
        temporary = None
        try:
            self.path.mkdir(parents=True, exist_ok=True, mode=0o700)
            # One write lock bounds space even when multiple processes finish together.
            with open(self.path / '.write.lock', 'a') as lock:
                fcntl.flock(lock, fcntl.LOCK_EX)
                files = []
                now = time.time()
                for path in self.path.glob('*.cache'):
                    try:
                        stat = path.stat()
                        if now - stat.st_mtime >= self.ttl:
                            path.unlink(missing_ok=True)
                        else:
                            files.append((stat.st_mtime, stat.st_size, path))
                    except FileNotFoundError:
                        pass
                total = sum(size for _, size, _ in files)
                for _, size, path in sorted(files):
                    if total + len(value) <= self.max_bytes:
                        break
                    path.unlink(missing_ok=True)
                    total -= size
                with tempfile.NamedTemporaryFile(dir=self.path, delete=False) as file:
                    temporary = file.name
                    file.write(value)
                os.replace(temporary, self.path / (self.digest(key) + '.cache'))
        except OSError:
            log.warning('Render cache write skipped')
        finally:
            if temporary:
                try:
                    os.unlink(temporary)
                except FileNotFoundError:
                    pass

    @contextmanager
    def lock(self, key, timeout=90):
        """Bounded single-flight locking across threads and processes.

        Fixed lock stripes avoid an unbounded collection of lock files.
        """
        try:
            self.path.mkdir(parents=True, exist_ok=True, mode=0o700)
            lock_file = open(self.path / ('.key-%02x.lock' % (int(self.digest(key)[:4], 16) % 64)), 'a')
        except OSError:
            # Caching is optional; the dedicated renderer still bounds PDF work.
            yield
            return
        with lock_file as lock:
            deadline = time.monotonic() + timeout
            while True:
                try:
                    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    break
                except BlockingIOError:
                    if time.monotonic() >= deadline:
                        raise TimeoutError('Report generation is busy; please retry shortly.')
                    time.sleep(0.05)
            try:
                yield
            finally:
                fcntl.flock(lock, fcntl.LOCK_UN)


image_cache = RenderCache('images', ttl=300, max_bytes=96 * 1024 * 1024)
html_cache = RenderCache('html', ttl=300, max_bytes=64 * 1024 * 1024)
pdf_cache = RenderCache('pdf', ttl=300, max_bytes=96 * 1024 * 1024)
