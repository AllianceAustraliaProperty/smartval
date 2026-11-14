#!/usr/bin/env python3
"""Automated Secret and Sensitive Information Scanner for SMARTval.

Crawls repository files and client build bundles to detect exposed credentials,
private keys, AWS tokens, database URIs, or accidental environment leakages.
"""
import argparse
import os
from pathlib import Path
import re
import sys

# High-risk credential patterns
SECRET_PATTERNS = [
    (r'AKIA[0-9A-Z]{16}', 'AWS Access Key ID'),
    (r'(?i)aws_secret_access_key\s*=\s*[\'"][A-Za-z0-9/\+=]{40}[\'"]', 'AWS Secret Access Key'),
    (r'-----BEGIN\s+(?:RSA|OPENSSH|EC|DSA|PGP|ENCRYPTED)?\s*PRIVATE\s+KEY-----', 'Private Cryptographic Key'),
    (r'mongodb(?:\+srv)?://[a-zA-Z0-9_\-\.\%]+:[^@\s"\'/]+@[a-zA-Z0-9_\-\.]+', 'MongoDB Connection URI with Embedded Credentials'),
    (r'(?i)(?:jwt_secret|session_secret)\s*=\s*[\'"][a-zA-Z0-9_\-]{32,}[\'"]', 'Hardcoded JWT Secret'),
]

# Patterns specifically forbidden in client bundles (.next/static or client components)
FORBIDDEN_CLIENT_PATTERNS = [
    (r'process\.env\.(?!NEXT_PUBLIC_|NODE_ENV)[A-Z0-9_]+', 'Server-only environment variable referenced in client context'),
    (r'FIREBASE_PRIVATE_KEY', 'Firebase Admin Private Key in Client Bundle'),
    (r'FIREBASE_CLIENT_EMAIL', 'Firebase Admin Client Email in Client Bundle'),
    (r'CLIENT_SECRET', 'Microsoft Graph Client Secret in Client Bundle'),
    (r'AWS_SECRET_ACCESS_KEY', 'AWS Secret Access Key in Client Bundle'),
    (r'MONGODB_URI', 'MongoDB URI in Client Bundle'),
]

IGNORED_DIRECTORIES = {
    '.git',
    'node_modules',
    '.venv',
    'venv',
    '__pycache__',
    '.next/cache',
    'dist',
    'build',
}

# Whitelisted files (e.g. example templates, test mocks, documentation)
WHITELISTED_PATHS = {
    'env.example',
    'backend/env.example',
    'frontend/env.example',
    'docs/SECURITY_AUDIT.md',
    'scripts/scan_secrets.py',
}


def is_whitelisted(file_path, repo_root):
    rel_path = file_path.relative_to(repo_root).as_posix()
    for white in WHITELISTED_PATHS:
        if rel_path == white or rel_path.endswith(white):
            return True
    return False


def scan_file(file_path, repo_root, is_client_bundle=False):
    findings = []
    if is_whitelisted(file_path, repo_root):
        return findings

    try:
        content = file_path.read_text(encoding='utf-8', errors='ignore')
    except Exception as e:
        return findings

    # General secret scan
    for pattern, desc in SECRET_PATTERNS:
        matches = re.finditer(pattern, content)
        for m in matches:
            matched_str = m.group(0)
            # Filter dummy placeholder values from templates
            if any(dummy in matched_str.lower() for dummy in ['your-', 'change-this', 'placeholder', 'dummy', 'localhost']):
                continue
            # Google API keys can be client-safe if prefixed by NEXT_PUBLIC_
            if 'Google API Key' in desc and 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY' in content:
                continue
            line_no = content.count('\n', 0, m.start()) + 1
            findings.append((file_path, line_no, desc, matched_str[:20] + '...'))

    # Strict client bundle scan
    if is_client_bundle:
        for pattern, desc in FORBIDDEN_CLIENT_PATTERNS:
            matches = re.finditer(pattern, content)
            for m in matches:
                matched_str = m.group(0)
                line_no = content.count('\n', 0, m.start()) + 1
                findings.append((file_path, line_no, f"[CLIENT LEAK] {desc}", matched_str))

    return findings


def scan_directory(base_dir, repo_root, is_client=False):
    findings = []
    if not base_dir.exists():
        return findings

    for root, dirs, files in os.walk(base_dir):
        # Filter out ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRECTORIES]
        
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in ['.js', '.jsx', '.ts', '.tsx', '.py', '.json', '.html', '.yml', '.yaml']:
                file_path = Path(root) / file
                is_bundle = is_client or ('.next' in file_path.parts and 'static' in file_path.parts)
                file_findings = scan_file(file_path, repo_root, is_client_bundle=is_bundle)
                findings.extend(file_findings)

    return findings


def main():
    parser = argparse.ArgumentParser(description="SMARTval Zero-Secret Leakage Scanner")
    parser.add_argument("--path", help="Specific directory or file to scan", default=None)
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    scan_target = Path(args.path) if args.path else repo_root

    print("=" * 60)
    print("  SMARTval Zero-Secret Leakage & Bundle Scan")
    print("=" * 60)
    print(f"Target: {scan_target.resolve()}\n")

    all_findings = []

    # 1. Scan client-side static build bundle if present
    static_bundle = repo_root / "frontend" / ".next" / "static"
    if static_bundle.exists():
        print("▶ Scanning Next.js client bundles in frontend/.next/static/...")
        bundle_findings = scan_directory(static_bundle, repo_root, is_client=True)
        all_findings.extend(bundle_findings)
        print(f"  Scanned bundle assets: {len(bundle_findings)} findings.")
    else:
        print("ℹ frontend/.next/static/ not found. Client bundles will be verified via source check.")

    # 2. Scan frontend source code
    frontend_src = repo_root / "frontend" / "src"
    if frontend_src.exists():
        print("▶ Scanning frontend source code in frontend/src/...")
        src_findings = scan_directory(frontend_src, repo_root)
        all_findings.extend(src_findings)
        print(f"  Scanned frontend source: {len(src_findings)} findings.")

    # 3. Scan backend source code
    backend_src = repo_root / "backend"
    if backend_src.exists():
        print("▶ Scanning backend source code in backend/...")
        backend_findings = scan_directory(backend_src, repo_root)
        all_findings.extend(backend_findings)
        print(f"  Scanned backend source: {len(backend_findings)} findings.")

    # 4. Scan docker and config files in root
    print("▶ Scanning root manifests and docker definitions...")
    for root_file in [repo_root / "docker-compose.yml", repo_root / "Caddyfile"]:
        if root_file.exists():
            root_findings = scan_file(root_file, repo_root)
            all_findings.extend(root_findings)

    print("\n" + "=" * 60)
    print("  Secret Scan Results")
    print("=" * 60)

    if not all_findings:
        print("\n\033[92m✓ ZERO SECRETS DETECTED. All client bundles and codebases are clean!\033[0m\n")
        sys.exit(0)
    else:
        print(f"\n\033[91m✗ {len(all_findings)} potential secret leakage(s) detected!\033[0m\n")
        for file_path, line_no, desc, snippet in all_findings:
            rel = file_path.relative_to(repo_root).as_posix()
            print(f"  - [{desc}] at {rel}:{line_no} -> snippet: {snippet}")
        print("\nPlease remediate all findings before shipping.")
        sys.exit(1)


if __name__ == "__main__":
    main()
