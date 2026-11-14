# SMARTval v1.0.0 Release & Git History Management Runbook

> **Strict Governance Notice**:  
> In accordance with project rules, all git operations are executed exclusively by Daddy. This document provides Daddy with verified, copy-pasteable commands and release procedures.

---

## 1. Context: 493 Clumsy Commits & Clean Release Baseline

During early rapid prototyping and iterative development, the repository accumulated over 493 informal, exploratory commits. To prepare a professional, enterprise-grade launch baseline for **SMARTval v1.0.0** (matching the standard established with Valtrack), Daddy can select one of two proven release management strategies:

### Option A: Annotated Semantic Release Tag on `main` (Recommended)
- **Advantages**: Preserves the complete development audit trail and `git blame` history, while marking an indisputable, immutable semantic baseline (`v1.0.0`) recognized by GitHub Releases, Docker image tags, and deployment scripts.
- **When to Use**: Internal enterprise deployments, team environments, and production servers where commit lineage is valuable.

### Option B: Pristine Orphan Baseline Branch (`release/v1.0`)
- **Advantages**: Produces a spotless, single-commit repository branch representing the clean, hardened codebase of v1.0.0, completely free from the 493 clumsy commits.
- **When to Use**: External client delivery, public open-source releases, or third-party audits where a tidy, unified initial commit is preferred.

---

## 2. Step-by-Step Execution Guide for Daddy

### Option A: Standard Release Tag on `main`

#### Step 1: Review Working Tree & Status
```bash
git status
```
*Verify that only desired edits (phase planning, hygiene deletions, User model index cleanup) are staged or modified.*

#### Step 2: Stage & Commit Phase 6 Hygiene Enhancements
```bash
# Stage all cleaned files, removals, and new documentation
git add .

# Commit Phase 6 repository hygiene
git commit -m "chore(hygiene): prune stale artifacts, clean dead code, and harden gitignore"
```

#### Step 3: Create Annotated Semantic Release Tag
```bash
git tag -a v1.0.0 -m "SMARTval v1.0.0 - Production Launch Baseline"
```

#### Step 4: Push to Remote Repository
```bash
# Push the main branch along with tags
git push origin main --tags
```

---

### Option B: Pristine Orphan Baseline Branch (`release/v1.0`)

#### Step 1: Ensure `main` is Committed
```bash
git add .
git commit -m "chore(hygiene): prune stale artifacts, clean dead code, and harden gitignore"
```

#### Step 2: Create Orphan Release Branch
```bash
git checkout --orphan release/v1.0
```

#### Step 3: Stage and Commit the Pristine Codebase
```bash
# Add all pristine files into a single root commit
git add -A

# Create consolidated baseline commit
git commit -m "feat(release): SMARTval v1.0.0 production baseline"
```

#### Step 4: Tag and Push the Clean Branch
```bash
# Tag the clean baseline
git tag -a v1.0.0-clean -m "SMARTval v1.0.0 Clean Baseline"

# Push the orphan branch to remote
git push origin release/v1.0 --tags

# Return to main development branch
git checkout main
```

---

## 3. Release Notes Template for SMARTval v1.0.0

```markdown
# Release SMARTval v1.0.0

## Highlights

### Milestone 1: Valuation Reports Multi-Step Wizard Redesign
- **Design Tokens & Pill Primitives**: Custom royal blue design language (`#006ABE`), rounded pill inputs, and unified interactive controls.
- **Top Navigation Bar & 10-Step Stepper**: Sticky navigation bar with autosave indicator, discard draft button, and full 10-step horizontal stepper.
- **Universal Step Card Shell**: Standardized `ReportCardShell` container across all 10 wizard sections.
- **Parity & Integration**: 100% field parity with legacy report workflows, autosave queue with request coalescing, and image optimization pipeline.

### Milestone 2: Production Launch & Codebase Hardening
- **Global UI Overhaul**: Modernized `/account`, `/settings`, and `/admin` with unified royal blue design tokens.
- **Centralized Loading States**: Accessible `<LoadingScreen />` component with blur backdrops and Next.js 15 App Router `loading.tsx` skeletons across all primary routes.
- **Live Telemetry Dashboard**: Admin dashboard wired to genuine MongoDB metrics endpoint (`/api/admin/metrics`), purging all fake mock events and hardcoded uptimes.
- **Repository Hygiene**: Purged loose test HTML, scratch images, obsolete root entry points, duplicate npm lockfiles, and empty directories.
- **Model Index Optimization**: Eliminated duplicate Mongoose schema index declarations on `User.ts`.
- **Fortified `.gitignore`**: Hardened protection against test outputs, runtime scratch dumps, and sensitive files.

## Verification & Quality Gates
- **TypeScript**: 0 compiler errors (`npx tsc --noEmit`).
- **Production Build**: 100% successful Next.js 15 build across all 25 routes.
- **Security**: Strict RBAC, session cookie synchronization, and zero duplicate schema warnings.
```

---

## 4. Pre-Ship Checklist for Daddy

- [ ] All unit and integration tests passing (`python scripts/test_runner.py`).
- [ ] Next.js production build completes cleanly (`cd frontend && npm run build`).
- [ ] Secret leakage scan returns zero findings (`python scripts/scan_secrets.py`).
- [ ] 20-point pre-ship security audit certified (`docs/SECURITY_AUDIT.md`).
- [ ] No loose test or scratch files remaining in root.
- [ ] `.gitignore` contains rules for temporary outputs and test artifacts.
- [ ] Annotated tag `v1.0.0` or orphan branch `release/v1.0` created and pushed.

---

## 5. AWS EC2 Launch Guide & Deployment Workflow

### Prerequisites on EC2
1. **OS**: Ubuntu 22.04 LTS / 24.04 LTS (recommended: `t3.medium` or larger for Chromium rendering).
2. **Software Packages**:
   ```bash
   sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin python3
   sudo usermod -aG docker $USER
   ```
3. **Repository Directory Setup**:
   ```bash
   sudo mkdir -p /app/smartval
   sudo chown -R $USER:$USER /app/smartval
   cd /app/smartval
   git clone https://github.com/Alliance-Australia-Property/smartval.git .
   git checkout v1.0.0
   ```

### Environment Configuration Setup
Copy environment templates and populate secrets on the EC2 host:
```bash
# Frontend environment
cp frontend/env.example frontend/.env
# Populate FIREBASE_PRIVATE_KEY, MONGODB_URI, and client IDs in frontend/.env

# Backend environment
cp backend/env.example backend/.env
# Populate SECRET_KEY, MONGODB_URI, and AWS S3 credentials in backend/.env
```

### Option 1: Automated Safe Zero-Downtime Deployment (Recommended)
`scripts/deploy-release.py` builds the new version, verifies `/login` health, and automatically rolls back if healthchecks fail:
```bash
python3 scripts/deploy-release.py
```

### Option 2: Direct Compose Launch
```bash
export IMAGE_TAG=v1.0.0
docker compose build
docker compose up -d
```

---

## 6. Post-Deployment Smoke Test Protocol

Run these verification checks immediately after deployment to confirm 100% operational readiness:

### 1. Ingress Security Headers & SSL Check
```bash
curl -I https://aapvaluations.com.au
```
*Expected Output*:
- `HTTP/2 200`
- `strict-transport-security: max-age=31536000; includeSubDomains; preload`
- `x-content-type-options: nosniff`
- `x-frame-options: SAMEORIGIN`
- `server` header stripped.

### 2. Service Healthcheck Endpoints
```bash
# Frontend health
docker exec smartval-frontend wget -qO- http://127.0.0.1:3000/api/health
# Backend health
docker exec smartval-backend python3 -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:5000/health').read().decode())"
# PDF worker health
docker exec smartval-pdf-worker python3 -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:5001/health').read().decode())"
```

### 3. Live Admin Telemetry
Navigate to `https://aapvaluations.com.au/admin` and verify:
- Genuine system uptime and active users displayed.
- Security events stream renders genuine logs (zero fake/mock cards).

---

## 7. Disaster Recovery & Instant Rollback Protocol

If an unexpected runtime regression occurs in production, execute an instant rollback:

### Automated Rollback State
`scripts/deploy-release.py` automatically maintains a `smartval-releases/` directory containing previous container images and compose files:
```bash
# Inspect the last healthy release
ls -la smartval-releases/

# Re-activate previous images instantly
docker compose -p smartval -f smartval-releases/current-compose.yml up -d
```

### Emergency Hard Reset to Last Tag
```bash
git checkout v1.0.0-prev
IMAGE_TAG=v1.0.0-prev docker compose up -d --no-build
```

