#!/usr/bin/env python3
"""Unified Test Runner for SMARTval.

Executes frontend type checking, linting, and all backend Python unit tests.
Returns exit code 0 on complete pass, 1 on any failure.
"""
import argparse
import os
from pathlib import Path
import subprocess
import sys
import time

# ANSI color codes
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
CYAN = '\033[96m'
BOLD = '\033[1m'
RESET = '\033[0m'

if not sys.stdout.isatty():
    GREEN = RED = YELLOW = CYAN = BOLD = RESET = ''


def print_header(title):
    print(f"\n{BOLD}{CYAN}{'=' * 60}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{BOLD}{CYAN}{'=' * 60}{RESET}\n")


def run_step(name, command, cwd, env=None):
    print(f"{BOLD}▶ Running {name}...{RESET}")
    start_time = time.time()
    current_env = os.environ.copy()
    if env:
        current_env.update(env)

    # Use shell=True on Windows for npm/npx resolving
    is_windows = os.name == 'nt'
    cmd_str = command if isinstance(command, str) else ' '.join(command)

    try:
        result = subprocess.run(
            cmd_str if is_windows else command,
            cwd=str(cwd),
            env=current_env,
            shell=is_windows,
            text=True,
            capture_output=False
        )
        duration = time.time() - start_time
        if result.returncode == 0:
            print(f"{GREEN}✓ {name} passed ({duration:.2f}s){RESET}\n")
            return True, duration
        else:
            print(f"{RED}✗ {name} failed with exit code {result.returncode} ({duration:.2f}s){RESET}\n")
            return False, duration
    except Exception as e:
        duration = time.time() - start_time
        print(f"{RED}✗ {name} encountered an exception: {e} ({duration:.2f}s){RESET}\n")
        return False, duration


def main():
    parser = argparse.ArgumentParser(description="SMARTval Master Test Runner")
    parser.add_argument("--frontend-only", action="store_true", help="Run only frontend checks")
    parser.add_argument("--backend-only", action="store_true", help="Run only backend test suite")
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable verbose test outputs")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    frontend_dir = repo_root / "frontend"
    backend_dir = repo_root / "backend"

    print_header("SMARTval Unified CI & Automated Test Suite")
    overall_start = time.time()
    results = []

    # 1. Frontend Checks
    if not args.backend_only:
        print_header("Step 1: Frontend Typecheck & Lint")
        ok, dur = run_step(
            "Frontend TypeScript Compile & Lint (npm test)",
            "npm test",
            cwd=frontend_dir
        )
        results.append(("Frontend (tsc & lint)", ok, dur))

    # 2. Backend Unit Tests
    if not args.frontend_only:
        print_header("Step 2: Backend Python Unit Tests")
        python_exe = sys.executable
        verbosity = "-v" if args.verbose else ""
        test_cmd = f'"{python_exe}" -m unittest discover -s backend/tests -t backend {verbosity}'.strip()
        ok, dur = run_step(
            "Backend Unit Tests (unittest)",
            test_cmd,
            cwd=repo_root
        )
        results.append(("Backend Unit Tests", ok, dur))

    # Summary
    overall_duration = time.time() - overall_start
    print_header("Test Execution Summary")
    all_passed = True
    for name, ok, dur in results:
        status_badge = f"{GREEN}PASS{RESET}" if ok else f"{RED}FAIL{RESET}"
        if not ok:
            all_passed = False
        print(f"  [{status_badge}] {name:<35} ({dur:.2f}s)")

    print(f"\n{BOLD}Total Elapsed Time:{RESET} {overall_duration:.2f}s")

    if all_passed:
        print(f"\n{GREEN}{BOLD}All test suites passed successfully! Ready for production.{RESET}\n")
        sys.exit(0)
    else:
        print(f"\n{RED}{BOLD}One or more test suites failed! Please review errors above.{RESET}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
