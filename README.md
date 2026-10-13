# SmartVal

SmartVal is the property valuation application at **https://aapvaluations.com.au**.
This README explains the recovery and improvements completed on **13 October 2026**,
how the app now runs, and what the team still needs to do.

## Current status

- The recovery and performance changes are deployed and pushed to `main`.
- The frontend, backend and PDF worker passed their latest health checks, with no container restarts recorded after deployment.
- Login, JavaScript assets, protected routes, report reads, inspection-report reads and a synthetic PDF render were checked.
- Alliance connectivity is still unresolved and is left for the developer, as requested.
- Credential rotation is still outstanding; the owner asked their team to handle it separately.

These are results from the deployment checks, not a promise of continuous monitoring.

## What was done

### 1. Recovered the app and reduced resource usage

The old frontend container contained malicious files and a mining process. It was
using excessive CPU, memory, processes and swap, and had recorded memory crashes.

- Preserved incident evidence and saved the affected container as a stopped quarantine image.
- Rebuilt the frontend from tracked repository source and restored public access.
- Updated Next.js to **15.5.27**, React/React DOM to **19.0.8**, Node to **22.23.3** and Sharp to **0.35.5**, with compatible dependency fixes.
- Added a read-only filesystem, restricted permissions, process limits, bounded temporary storage, and frontend limits of **2 CPUs / 2 GiB RAM without swap**.
- Retained the database and uploads. Restored the working Caddy configuration.
- Checked selected host startup locations and packages. This was a limited incident review, not a complete forensic investigation.

The production dependency audit at recovery time found **no high or critical findings**,
with **two moderate findings** remaining in the ExcelJS/UUID dependency chain.

### 2. Made report listing and PDFs faster

- Added the `report_listing_updated_at` MongoDB index.
- Combined the dashboard's report-page and total-count lookup into one database request.
- Added bounded caches for processed images, report HTML and PDF output.
- Moved PDF rendering into a separate worker so it does not consume normal API workers.
- Limited PDF concurrency and queue size. When busy, the service returns a retryable error instead of accepting unlimited work.
- Reused the PDF browser safely while giving each document a separate browser context.

### 3. Reduced unnecessary dashboard requests

- Removed inspection and Alliance fetches whose results were not displayed.
- Cancelled obsolete searches and ignored late responses from older searches.
- Prevented duplicate pagination requests and added visible retry feedback.
- Fixed the undefined database references in the inspection and Alliance backend routes.

The separate Alliance connection problem is documented below; fixing the database
reference does not fix its upstream URL or authentication.

### 4. Made additional-photo editing safer

- Combined rapid typing into a save after a short pause instead of saving the whole list on every keystroke.
- Serialized additional-photo writes so older saves cannot finish after newer saves from the same browser.
- Kept pending edits when navigating between report sections.
- Coordinated additional-photo saves with uploads, deletion, reordering and report actions.
- Added saving/error feedback and retry controls. Failed initial photo loads no longer clear the parent form's photo data.

### 5. Reduced editor work and protected report saves

- Loaded editor sections when opened instead of importing every section upfront.
- Recalculated completion indicators only for the affected section and avoided state updates when indicators did not change.
- Saved the current validated form before report/invoice previews, PDF downloads and existing email actions.
- Stopped document generation when saving fails, so it does not silently use an older saved draft.
- Changed editor saves to send only changed fields, with version checks and an atomic database comparison to detect conflicting changes.
- Kept the editor open after save failures and added **Download unsaved draft** for recovery.

Email confirmation steps remain in place. No emails were sent during verification.
Existing users should save their work and refresh to load the updated editor.

### 6. Made deployment safer

- Replaced the obsolete npm/systemd/nginx GitHub deployment with the current Docker process.
- Added a deployment lock, builds before service replacement, health checks, and automatic rollback after failed activation.
- Preserved previous image IDs and Compose configuration for rollback.
- Removed temporary test containers and unused build cache during the work, while retaining rollback images.
- Preserved the pre-existing file-mode change to `scripts/setup-ec2-maintenance.sh`; it was not included in these commits.

## Measured results

| Check | Before | After |
| --- | --- | --- |
| Report-list request | About 0.51 seconds | About 0.25 seconds |
| First PDF generation for the tested 14-page report | About 36.2 seconds | About 5.9–6.3 seconds |
| Repeated unchanged PDF request | Not recorded | About 0.27 seconds |
| Initial editor route JavaScript, gzipped | 222,374 bytes | About 133,000 bytes — roughly 40% smaller |
| Frontend memory snapshot | About 1.86 GiB | About 76–81 MiB after recovery/updates |

These are specific server checks and bundle/resource measurements, not a full load
test or a guarantee for every report. The bundle figure excludes sections loaded later.

## What was tested

- Production builds and TypeScript validation.
- 16 frontend unit tests and 28 backend/deployment tests in the latest batch, including conflict handling and a simulated rollback failure path.
- 10 synthetic browser workflow checks across the photo, dashboard and editor changes, using fake data.
- Twenty rapid photo edits produced one write; overlapping photo writes were prevented.
- Save-before-preview ordering, draft retention on failure, retry, section navigation and stale search responses.
- Residential, commercial and invoice PDF output during the PDF work; a synthetic PDF render after the final release.
- Live service health, public login/assets, authentication boundaries and read-only report/inspection checks.

**Testing limit:** the owner requested server checks only for production. There was
no real-user signed-in browser walkthrough or real email-delivery test. The GitHub
workflow file was updated, but this release was deployed directly on the server with
the deployment script; the GitHub-triggered path still needs a controlled verification.

## How production runs

Repository on the server: `/home/ec2-user/smartval`.

| Service | Purpose |
| --- | --- |
| `smartval-caddy` | Public HTTPS entry point on ports 80/443 |
| `smartval-frontend` | Next.js UI, internal port 3000 |
| `smartval-backend` | Flask API, internal port 5000 |
| `smartval-pdf-worker` | Isolated PDF rendering, internal port 5001 |

Use [docker-compose.yml](docker-compose.yml) as the production configuration.
Do not expose frontend/backend/worker ports directly to the internet. Restrict SSH
access to approved administrators. Backend and frontend environment files are kept
on the host, outside Git; do not add credentials to this README or the repository.

The deployed application image tags for this release are
`smartval-frontend:reliability-20261013` and `smartval-backend:reliability-20261013`.
The backend image also runs the PDF worker.

## Deploying on the existing production host

Use [scripts/deploy-release.py](scripts/deploy-release.py). Older deployment guides
and scripts may describe a previous architecture; use this section for the current host.

```bash
cd /home/ec2-user/smartval
git fetch origin main
git merge --ff-only origin/main
python3 scripts/deploy-release.py
```

The script builds while the current app remains running, then replaces the PDF worker,
backend and frontend in order and checks them. Service replacement can briefly interrupt
requests; it is not a zero-downtime deployment. Caddy is left running.

The GitHub workflow uses `EC2_HOST`, `EC2_USER` and `EC2_SSH_KEY`, plus the host's Git
read access. Normal pushes to `main` trigger it; `[skip ci]` commits do not. This
documentation-only update uses `[skip ci]` to avoid an unnecessary application restart.

The script assumes an existing working installation and running containers. It is
not yet a fresh-server bootstrap or disaster-recovery procedure. It currently reads
frontend build-time public settings from the running frontend container; simply editing
an environment file is not sufficient to update those baked-in settings.

### Check after deployment

```bash
docker ps
curl -fsS https://aapvaluations.com.au/login > /dev/null
docker exec smartval-frontend node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
docker exec smartval-backend python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:5000/health').status)"
docker exec smartval-pdf-worker python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:5001/health').status)"
```

Each health request should succeed. Protected APIs should still reject unauthenticated
requests. Inspect recent service logs if a check fails; avoid copying customer data or
credentials from logs into tickets.

### Rollback and recovery records

- Release metadata, build logs, prior image IDs and prior Compose configuration: `~/smartval-releases/`.
- Failed activation automatically attempts to restore the prior images/configuration and checks service health. A failure during rollback still needs an operator.
- This is application rollback only; it does not restore database or uploaded-file data.
- Recovery evidence: `/var/lib/smartval-recovery/20261013` (root-only).
- Quarantine image: `smartval-frontend:quarantine-20261013`. **Do not run it or use it for rollback.**
- Earlier private backups: `~/smartval-perf-private-20261013`, `~/smartval-editor-backup-20261013`, and `~/smartval-reliability-backup-20261013`.

Keep the necessary known-good rollback images. Do not run broad image/volume cleanup
without checking what it will remove. Code/image backups do not prove that customer-data
backups are recoverable; a restore test remains a TODO.

## Developer notes

The report GET response includes `fieldVersions`. Updated editors send
`PATCH /api/valuation-reports/<id>` with `changes` and matching `expected` versions.
The backend checks changed fields and compares their current values atomically before
writing. Conflicts return HTTP 409, preserving the browser draft. Unrelated fields are
not overwritten. Users can download their draft and compare it with the latest report;
there is no automatic merge or force-save.

Legacy PUT clients remain compatible but do not get this protection. Additional-photo
serialization protects one browser's writes; it is not complete cross-user protection
for every media endpoint. Review those remaining writers before claiming all editing
paths are conflict-safe.

Tests from `frontend` after installing its dependencies:

```bash
node --test tests/request-saves.test.cjs tests/editor-reliability.test.cjs
node node_modules/typescript/bin/tsc --noEmit
```

Tests from `backend` in an environment with its dependencies:

```bash
python -m unittest tests.test_report_edits tests.test_performance
```

The deployment test uses Linux and expects `scripts/deploy-release.py` mounted at
`/release/deploy-release.py`; browser fixtures require Playwright and Chromium.
Production backend images exclude tests, so mount the test directory for container runs.
See [frontend/tests](frontend/tests), [backend/tests](backend/tests) and
[PDF performance notes](docs/performance-operations.txt) for the supporting code/details.

## Developer follow-up: Alliance integration

**Problem:** `ALLIANCE_BASE_URL` points to SmartVal itself (`https://aapvaluations.com.au`).
The integration appends `/api/jobs.php`, which is not a SmartVal endpoint. Requests reach
the wrong application and fail. Removing unused dashboard requests stopped the wasted
calls, but did not repair the integration.

**Solution for the developer:**

1. Confirm whether the Alliance jobs integration is still required and obtain the real service URL/API documentation.
2. If active, set `ALLIANCE_BASE_URL` to the correct service and implement its required authentication using server-side configuration.
3. Verify a small jobs page, pagination and error handling. Use a disposable test job for import mapping and duplicate detection; do not modify customer jobs just to test connectivity.
4. If retired, check mobile/external callers before removing its API/import paths. The dashboard's external Alliance website link is separate.

The owner explicitly left this connection for the developer. No replacement URL or
authentication scheme has been guessed, and the integration has not been disabled.

## TODO — outstanding work

### Highest priority — owner / provider administrators

- [ ] **Rotate exposed credentials.** Review Firebase service-account credentials, MongoDB credentials, Groq keys and other secrets available to the affected process. Update host configuration, verify connectivity, then revoke old credentials. Deferred by the owner; not completed here.
- [ ] **Complete the incident review.** Review provider access logs and the cause of compromise; decide whether the host needs replacement. The limited checks did not establish whether historical data access occurred.
- [ ] **Verify customer-data recovery.** Confirm MongoDB and upload-storage backups, retention and access controls. Restore a backup into an isolated environment and document the result.

### Developer — application and integration

- [ ] **Resolve Alliance** using the problem/solution above, or agree its retirement with the owner.
- [ ] **Test real signed-in workflows** with approved test records: edit/save, upload/reorder/delete photos, navigate sections, search/paginate, preview/download reports and invoices, and reconcile a simultaneous-edit conflict. Test email only with an explicitly approved test recipient.
- [ ] **Extend conflict protection** to remaining legacy PUT/mobile clients and direct media-update endpoints. Avoid removing old APIs before identifying callers.
- [ ] **Review the remaining moderate dependency findings** in ExcelJS/UUID and re-run the production audit; verify spreadsheet import/export after any upgrade.
- [ ] **Measure real browser performance and concurrent use.** Check editor interaction delays, large reports and PDF saturation; use the results to choose the next optimization.

### Developer / infrastructure administrator — operations

- [ ] **Verify the GitHub-triggered deployment** in a controlled run, including secrets, host Git access and rollback. Direct server deployment passed; the Actions path was not exercised during this work.
- [ ] **Strengthen release controls.** Run tests before activation, deploy the intended immutable commit, and support validated frontend build-time settings without relying on the running container's environment.
- [ ] **Document and test fresh-server recovery.** Include environment provisioning, database/index setup, uploads, Caddy data and the first deployment.
- [ ] **Investigate MongoDB latency.** Round trips measured about 250 ms. Confirm the database region and network path; assess co-location before planning any migration.
- [ ] **Add operational alerts.** Cover slow/failed requests, save conflicts/failures, PDF queue saturation, container restarts and low disk space. Current health checks are not an alerting service.
- [ ] **Review maintenance cleanup.** Check `scripts/setup-ec2-maintenance.sh` and image/volume retention so cleanup cannot remove required rollback images or data. Its existing mode-only change was preserved.

## Change history

| Commit | Completed work |
| --- | --- |
| `0a90bc3` | Frontend recovery, dependency patches and container hardening |
| `fc74b53` | Report-list index/query improvements, caching and isolated PDF worker |
| `53eb633` | Additional-photo save coordination and dashboard request fixes |
| `b3e7663` | Editor loading/status improvements, conflict-safe editor saves, save-before-document actions, database references and Docker deployment/rollback |

All four code changes were pushed to `main` and deployed before this documentation update.
