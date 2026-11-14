# SMARTval — Enterprise Property Valuation & Report Generation Platform

**Version:** `v1.0.0` (Production Baseline)  
**Production Host:** `https://aapvaluations.com.au`  
**Architecture:** Next.js 15.5 App Router · React 19 · Flask 3.1 · MongoDB Atlas · Headless Chromium PDF Worker · Caddy 2.8 Ingress  

---

## 1. Overview & System Architecture

SMARTval is an enterprise-grade web application and automated report generation engine built for registered Australian property valuers. The platform streamlines property inspections, comparable sales analysis, multi-tenant branding, and complex valuation drafting into compliant, high-resolution PDF valuation reports.

### Architecture Topology

```
                    Internet (HTTPS :443 / HTTP :80)
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │    smartval-caddy (v2.8+)     │
                   │  - Automatic TLS (Let's Encrypt)
                   │  - 6 Defensive Security Headers│
                   └───────┬───────────────┬───────┘
                           │               │
            ┌──────────────┘               └──────────────┐
            ▼                                             ▼
  ┌───────────────────┐                         ┌───────────────────┐
  │ smartval-frontend │                         │ smartval-backend  │
  │  Next.js 15.5 UI  │                         │   Flask 3.1 API   │
  │  Port 3000        │                         │   Port 5000       │
  └─────────┬─────────┘                         └─────────┬─────────┘
            │                                             │
            │ Firebase Auth / App Router                  │ REST / PyMongo
            ▼                                             ▼
     Client Browser                              ┌──────────────────┐
                                                 │  MongoDB Atlas   │
                                                 │  Replica Set     │
                                                 └────────┬─────────┘
                                                          │
                    ┌─────────────────────────────────────┴─────────────┐
                    ▼                                                   ▼
         ┌─────────────────────┐                             ┌─────────────────────┐
         │ smartval-pdf-worker │                             │smartval-email-worker│
         │ Headless Chromium   │                             │ Atomic Queue Worker │
         │ Internal Port 5001  │                             │ Graph Mail Engine   │
         └─────────────────────┘                             └─────────────────────┘
```

### Production Services

| Service | Container Name | Technology | Internal Port | Purpose |
|---|---|---|---|---|
| **Ingress Proxy** | `smartval-caddy` | Caddy 2.8+ Alpine | 80, 443 | Public reverse proxy, automatic TLS, and enterprise security headers. |
| **Frontend** | `smartval-frontend` | Next.js 15.5, React 19, TypeScript | 3000 | Multi-step valuation wizard, admin telemetry, and user management. |
| **Backend API** | `smartval-backend` | Python 3.11, Flask 3.1, Gunicorn | 5000 | RESTful API, authentication boundaries, and tenant orchestration. |
| **PDF Worker** | `smartval-pdf-worker` | Python, Playwright, Chromium | 5001 | Isolated headless report rendering with bounded concurrency & caching. |
| **Email Worker** | `smartval-email-worker` | Python 3.11, PyMongo, MS Graph | None (Worker) | Background worker executing scheduled report email deliveries atomically. |

---

## 2. Core Features & Capabilities

### 10-Step Valuation Wizard
- Structured navigation across Property Identification, Physical Attributes, Improvements, Town Planning, Environmental Factors, Rating & Taxation, Comparables, Property Descriptors, General Comments, and Valuation Certification.
- **Autosave & Concurrency Protection:** Atomic `PATCH /api/valuation-reports/<id>` saves with `expectedVersions` conflict detection tokens, preventing overwrite of concurrent edits.
- **Universal Step Shell:** Royal blue accents (`#006ABE`), standardized step card wrappers, and responsive pill inputs.
- **Centralized Loading State:** Unified `<LoadingScreen />` spinning loader with zero skeleton flash.

### Multi-Tenant Branding Engine
- Dynamic tenant resolution supporting **AAP** (Australian Asset Professionals), **TAMN**, and **CPV** (Commercial Property Valuers).
- Complete tenant isolation across document covers, running headers/footers, disclaimers, and signature blocks without data leakage.

### Strata Unit Land Value Rules
- Automatic compliance formatting: Freehold property valuations display separate unimproved and statutory land values.
- Strata-titled residential and commercial units automatically suppress separate land valuation rows, dynamically rendering legal strata disclosure disclaimers across `residential.html` and `cgt_short.html`.

### Modular Jinja2 PDF Generation
- Template engine modularized into 9 shared partials located in `backend/templates/partials/`:
  - `header.html`, `footer.html`, `cover_page.html`, `property_summary.html`, `sales_evidence.html`, `valuation_summary.html`, `disclaimer.html`, `annexures.html`, and `signature_block.html`.
- Enables rapid maintenance, tenant switching, and consistent typography across residential, commercial, and CGT reports.

### Real-Time Admin Telemetry
- Observability route at `/api/admin/metrics` reporting live CPU/memory stats, active database roundtrip latency, process uptime, and worker queue depth directly to the `/admin` portal.

### Defensive Ingress Security
- Caddy reverse proxy enforces 6 mandatory security headers:
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()`
  - Explicit removal of the upstream `Server` identification banner.

---

## 3. Local Development Quickstart

### Prerequisites
- **Node.js:** `v22.x` or higher
- **Python:** `v3.11` or higher
- **MongoDB:** Local instance or MongoDB Atlas connection string
- **Docker & Docker Compose:** Optional for containerized local workflows

### 1. Frontend Setup

```bash
cd frontend

# Configure environment
cp env.example .env.local

# Install dependencies and start development server
npm install
npm run dev
```
The frontend starts at `http://localhost:3000`.

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend API (binds to 0.0.0.0:5000 by default)
python run.py
```
The backend API starts at `http://localhost:5000`.

> **Note on Windows Port Conflicts:** If port 5000 fails to bind or returns 404s, ensure no rogue process (such as Apple AirPlay Receiver or orphaned Node backends) is listening on `::5000`.

---

## 4. Automated Testing & Quality Gates

SMARTval incorporates an automated verification pipeline to ensure zero regressions, code quality, and security compliance.

### Unified CI Test Runner

Run the consolidated master test runner from the repository root:

```bash
python scripts/test_runner.py
```

This single command automatically executes:
1. **Frontend Typecheck & Lint:** `npm test` (`tsc --noEmit && next lint`).
2. **Backend Unit & Regression Tests:** Full Python `unittest` suite (71 test cases).
3. **Deployment Lifecycle Tests:** Simulated atomic deployment, health checks, and rollback scenarios.
4. **Template & Multi-Tenant Tests:** Branding isolation and strata land value suppression verification.

### Automated Zero-Secret Scanner

Verify that no sensitive API keys, Firebase service accounts, or MongoDB URIs have leaked into source code or build output:

```bash
python scripts/scan_secrets.py
```

### 20-Point Pre-Ship Security Gate

All releases must satisfy the mandatory 20-point pre-ship security gate. The complete audit report and verification matrix is documented in:
[`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md)

Key security protections include:
- `server-only` guards on database and OneDrive server modules.
- `productionBrowserSourceMaps: false` to prevent bundle reverse engineering.
- Firebase JWT token verification and Origin validation on all mutation endpoints.
- Read-only root container filesystems with non-root runtime users.

---

## 5. Production Deployment on AWS EC2

### Production Host Details
- **Host Location:** `/home/ec2-user/smartval`
- **Compose Manifest:** `docker-compose.yml`
- **Release Directory:** `~/smartval-releases/`
- **Detailed Runbook:** [`docs/RELEASE_RUNBOOK.md`](docs/RELEASE_RUNBOOK.md)

### Deployment Procedure

Deploying a new release on the production EC2 host:

```bash
cd /home/ec2-user/smartval

# 1. Fetch the latest verified release from main
git fetch origin main
git merge --ff-only origin/main

# 2. Execute automated deployment script
python3 scripts/deploy-release.py
```

The deployment script executes the following steps:
1. Acquires a deployment lock (`/tmp/smartval-deploy.lock`).
2. Builds updated container images tagged with the active commit SHA/tag.
3. Replaces services sequentially (`smartval-pdf-worker` -> `smartval-backend` -> `smartval-frontend`).
4. Executes container health checks. If any health check fails within 60 seconds, it automatically triggers rollback to the previous working image set.
5. Emits release metadata and rollback state into `~/smartval-releases/`.

### Docker Compose Direct Deployment

Deploying with explicit image tags:

```bash
IMAGE_TAG=v1.0.0 docker compose up -d --build
```

### Post-Deployment Verification Commands

```bash
# Verify container health
docker ps

# Check public ingress
curl -fsS https://aapvaluations.com.au/login > /dev/null

# Verify frontend internal health
docker exec smartval-frontend node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Verify backend internal health
docker exec smartval-backend python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:5000/health').status)"

# Verify PDF worker internal health
docker exec smartval-pdf-worker python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:5001/health').status)"

# Verify scheduled email worker heartbeat
docker exec smartval-email-worker python email_scheduler.py --healthcheck
```

---

## 6. Scheduled Email Worker Operational Specifications

SMARTval includes a dedicated background email worker (`smartval-email-worker`) that processes scheduled valuation report deliveries via Microsoft Graph Mail.

### How to Schedule a Report Email
1. Open any valuation report in the editor and click **Schedule email** beside Report Actions.
2. Select recipient **To**, optional **Cc**, greeting, send date/time, and timezone (default: `Australia/Sydney`).
3. Click **Prepare email preview**. This saves the current report draft and freezes the generated PDF attachment.
4. Review the frozen PDF and click **Confirm Schedule**.
5. The schedule runs asynchronously. You can safely close your browser.

### Delivery Rules & Operational Constraints
- **Timing:** Must be scheduled at least **2 minutes** in advance and at most **1 year** in advance. Ambiguous daylight-saving transitions are rejected.
- **Attachment Size:** Frozen PDFs must be **2.5 MB or smaller** (Microsoft Graph inline attachment limit).
- **Worker Cadence:**
  - Idle poll interval: **15 seconds**.
  - Active burst interval: **1 second** after completing a job.
  - Heartbeat write: **Every 60 seconds** to `reportEmailSchedulerState` in MongoDB.
  - Expired-lease recovery: Startup and **every 5 minutes**.
  - Payload cleanup: Hourly (removes frozen attachments for jobs completed >30 days ago).
- **Atomic Job Claims:** Uses MongoDB atomic `find_one_and_update` with lease locks, guaranteeing zero duplicate sends across container restarts.
- **Failure Handling:** Crashes before submission recover on the next lease cycle. Submissions that timeout or crash during Microsoft Graph dispatch enter **Needs review** status and are never resent automatically to prevent duplicate customer emails.

### Worker Health & Log Inspection

```bash
# Check worker heartbeat
docker exec smartval-email-worker python email_scheduler.py --healthcheck

# View recent worker logs
docker logs --tail 50 -f smartval-email-worker
```

---

## 7. Incident History & Baseline Maintenance

### October 2026 Quarantine & Recovery Baseline
- On October 13, 2026, an obsolete frontend container was found to have been compromised by an unauthorized process.
- The affected container was quarantined as `smartval-frontend:quarantine-20261013` and forensically preserved at `/var/lib/smartval-recovery/20261013`.
- The frontend was rebuilt cleanly from repository source with updated base images, read-only root filesystems, strict process and memory limits (2 CPUs / 2 GiB RAM without swap), and non-root execution.
- Operational maintenance scripts (`scripts/setup-ec2-maintenance.sh`) ensure automated image retention and prevent disk space exhaustion.

---

## 8. Repository Structure

```
smartval/
├── .planning/                  # Project roadmap, state tracking & phase verification
├── backend/                    # Flask 3.1 REST API & Email Scheduler
│   ├── blueprints/             # API routes (reports, schedules, auth, admin)
│   ├── templates/              # Valuation report templates
│   │   ├── partials/           # 9 Modular Jinja2 template partials
│   │   ├── residential.html    # Residential valuation report
│   │   └── cgt_short.html      # Capital Gains Tax short-form report
│   ├── tests/                  # Unit and integration test suite
│   ├── email_scheduler.py      # Background scheduled email worker
│   └── run.py                  # API entry point (0.0.0.0:5000)
├── frontend/                   # Next.js 15.5 App Router & React 19 UI
│   ├── src/
│   │   ├── app/                # App Router pages (/valuation-reports, /admin, etc.)
│   │   ├── components/         # Reusable UI components & 10-step wizard sections
│   │   ├── config/             # Database & Firebase server configurations
│   │   └── lib/                # Utility libraries & OneDrive integration
│   ├── package.json            # Frontend dependencies & test scripts
│   └── next.config.ts          # Next.js production build configuration
├── docs/                       # Project documentation & runbooks
│   ├── SECURITY_AUDIT.md       # Daddy's 20-point pre-ship security gate
│   └── RELEASE_RUNBOOK.md      # AWS EC2 launch & rollback guide
├── scripts/                    # Operational automation & test runners
│   ├── deploy-release.py       # Atomic zero-downtime deployment script
│   ├── test_runner.py          # Master unified test runner
│   └── scan_secrets.py         # Automated zero-secret scanner
├── Caddyfile                   # Ingress reverse proxy configuration with security headers
├── docker-compose.yml          # Production container orchestration
└── README.md                   # This document
```

---

## 9. License & Ownership

Confidential and proprietary property of **Australian Asset Professionals Pty Ltd (AAP)** and affiliated valuation practices. Unauthorized copying, distribution, or deployment is strictly prohibited.
