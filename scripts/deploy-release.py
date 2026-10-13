#!/usr/bin/env python3
"""Build before switching services, verify health and roll back failed releases."""
import argparse
from datetime import datetime, timezone
import fcntl
import json
from pathlib import Path
import shutil
import subprocess
import time
import urllib.request

SERVICES = {'frontend': 'smartval-frontend', 'backend': 'smartval-backend', 'pdf-worker': 'smartval-pdf-worker'}

def run(args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)

def inspect(name):
    return json.loads(subprocess.check_output(['docker', 'inspect', name]))[0]

def wait_healthy(service):
    if service == 'frontend':
        command = ['node', '-e', "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"]
    else:
        port = 5001 if service == 'pdf-worker' else 5000
        command = ['python', '-c', "import urllib.request; assert urllib.request.urlopen('http://127.0.0.1:%d/health',timeout=5).status == 200" % port]
    for _ in range(30):
        try:
            result = subprocess.run(['docker', 'exec', SERVICES[service], *command], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
            if result.returncode == 0: return
        except subprocess.TimeoutExpired:
            pass
        time.sleep(2)
    raise RuntimeError(service + ' did not become healthy')

def activate(compose, base, images, repo=None):
    for service in ('pdf-worker', 'backend', 'frontend'):
        run([compose, '--project-directory', str(repo or base.parent), '-p', 'smartval', '-f', str(base), '-f', str(images), 'up', '-d', '--no-deps', '--no-build', service])
        wait_healthy(service)

def deploy(repo, frontend_image=None, backend_image=None):
    compose = shutil.which('docker-compose') or '/usr/local/bin/docker-compose'
    base = repo / 'docker-compose.yml'
    revision = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=repo, text=True).strip()
    releases = repo.parent / 'smartval-releases'
    releases.mkdir(mode=0o700, exist_ok=True)
    with (releases / 'deploy.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        release = releases / (datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S') + '-' + revision)
        release.mkdir(mode=0o700)
        previous = {service: inspect(name)['Image'] for service, name in SERVICES.items()}
        rollback = release / 'rollback-images.json'
        rollback.write_text(json.dumps({'services': {s: {'image': image} for s, image in previous.items()}}))
        shutil.copy2(base, release / 'compose.yml')
        rollback_base = release / 'rollback-compose.yml'
        current_base = releases / 'current-compose.yml'
        shutil.copy2(current_base if current_base.exists() else base, rollback_base)
        if not frontend_image:
            frontend_image = 'smartval-frontend:release-' + revision
            args = ['docker', 'build', '-t', frontend_image]
            for value in inspect(SERVICES['frontend'])['Config']['Env']:
                if value.startswith('NEXT_PUBLIC_'): args.extend(['--build-arg', value])
            args.append(str(repo / 'frontend'))
            with (release / 'frontend-build.log').open('w') as log:
                run(args, stdout=log, stderr=subprocess.STDOUT)
        if not backend_image:
            backend_image = 'smartval-backend:release-' + revision
            with (release / 'backend-build.log').open('w') as log:
                run(['docker', 'build', '-t', backend_image, str(repo / 'backend')], stdout=log, stderr=subprocess.STDOUT)
        images = release / 'images.json'
        images.write_text(json.dumps({'services': {'frontend': {'image': frontend_image}, 'backend': {'image': backend_image}, 'pdf-worker': {'image': backend_image}}}))
        run([compose, '--project-directory', str(repo), '-p', 'smartval', '-f', str(base), '-f', str(images), 'config', '--quiet'], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        try:
            activate(compose, base, images)
            assert urllib.request.urlopen('https://aapvaluations.com.au/login', timeout=20).status == 200
        except Exception:
            print('Release failed; restoring previous service images.', flush=True)
            activate(compose, rollback_base, rollback, repo)
            shutil.copy2(rollback_base, base)
            print('Rollback services are healthy.', flush=True)
            raise
        (release / 'success.json').write_text(json.dumps({'revision': revision, 'frontend': frontend_image, 'backend': backend_image}))
        shutil.copy2(base, current_base)
        print('Release healthy. Rollback images recorded in', rollback)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--frontend-image')
    parser.add_argument('--backend-image')
    args = parser.parse_args()
    if bool(args.frontend_image) != bool(args.backend_image): parser.error('Specify both image options together')
    deploy(Path(__file__).resolve().parents[1], args.frontend_image, args.backend_image)
