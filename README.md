# SMARTval

## Quick Start

### Prerequisites
- Amazon Linux EC2 instance
- Docker and Docker Compose installed
- Google Maps API key
- MongoDB database (DocumentDB/Atlas/External)

### Deployment Steps

1. **Configure Environment**
   ```bash
   cp env.production .env
   nano .env  # Update with your values
   ```

2. **Deploy Application**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh production
   ```

3. **Verify Deployment**
   ```bash
   docker ps
   curl http://localhost:3000
   curl http://localhost:5000/health
   ```

### Required Environment Variables

Update `.env` file with:
- `GOOGLE_MAPS_API_KEY` - Your Google Maps API key
- `MONGODB_URI` - MongoDB connection string
- `SECRET_KEY` - Strong secret key (32+ characters)
- `CORS_ORIGINS` - Your company domains
- `NEXT_PUBLIC_API_URL` - Your API URL

### MongoDB Options

**AWS DocumentDB:**
```env
MONGODB_URI=mongodb://user:pass@cluster.docdb.amazonaws.com:27017/smartval?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

**MongoDB Atlas:**
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/smartval?retryWrites=true&w=majority
```

### Security Groups

Configure AWS Security Groups:
- Port 22 (SSH) - Your IP
- Port 3000 (Frontend) - 0.0.0.0/0
- Port 5000 (Backend) - Internal only

### Troubleshooting

View logs:
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

Restart services:
```bash
docker-compose -f docker-compose.prod.yml restart
```

---

**For detailed instructions, see DEPLOYMENT_INSTRUCTIONS.md**


## Production reliability updates (13 October 2026)

The editor loads sections on demand, recalculates only affected completion indicators,
and saves changed report fields through `PATCH /api/valuation-reports/<id>`.
The GET response supplies `fieldVersions`. A PATCH supplies `changes` and matching
`expected` field versions. The backend checks these versions and atomically compares
current field values before writing. Unrelated fields are left untouched. A conflict
returns HTTP 409; the editor retains the form and offers **Download unsaved draft**.
Users can keep that draft, open the latest report separately, and reconcile their edits.
There is no automatic overwrite or force-save on conflicts. Existing PUT clients remain
compatible, but clients that continue using PUT do not receive optimistic edit protection.

Preview, PDF and invoice actions in the editor save the current validated form first.
A failed save prevents document generation. Email actions retain their existing explicit
user confirmation and also wait for a successful save; deployment tests do not send email.
Additional-photo autosaves remain debounced and serialized with report saves.

### Deployment and rollback

The GitHub deployment now uses Docker rather than the obsolete systemd/nginx procedure.
On the EC2 host, run `python3 scripts/deploy-release.py`. It builds both images while the
existing app continues running, checks Compose configuration, then updates the PDF worker,
backend and frontend in order with health checks. A failed activation restores the previous
images and recorded Compose configuration. Deployment uses a host lock and GitHub concurrency
control. Build logs and rollback metadata live in `~/smartval-releases/`; they contain no
runtime credentials. Keep rollback images available; do not prune all unused images/volumes.
To deploy previously built and tested candidates, provide both `--frontend-image` and
`--backend-image`. Caddy is not restarted by this script. The GitHub SSH secrets must continue
to target the existing EC2 host; host Git credentials must retain repository read access.

Validation commands: `node --test tests/request-saves.test.cjs tests/editor-reliability.test.cjs`
from `frontend`, and `python -m unittest tests.test_report_edits tests.test_performance` from
`backend`. Synthetic browser fixtures under `frontend/tests` cover the actual editor's save,
preview and conflict behavior with fake records, without production login or email delivery.

### Developer follow-up: Alliance integration

**Problem:** production `ALLIANCE_BASE_URL` currently points to SmartVal itself
(`https://aapvaluations.com.au`). `backend/utils/alliance_service.py` appends `/api/jobs.php`,
but SmartVal has no such endpoint. Calls therefore reach the wrong application and fail.
Removing unused dashboard calls prevents these failures from slowing the report dashboard;
it does not repair the external connection. The missing database references in the Alliance
and inspection blueprints have been fixed separately.

**Solution:** confirm the actual Alliance jobs service and whether the integration is still
required. If active, set `ALLIANCE_BASE_URL` to that service's base URL in the backend environment,
implement the authentication required by its documented API using server-side configuration,
and verify `/api/jobs.php` returns the expected paginated JSON. Never put credentials in this
README, frontend code or Git. If the integration is retired, remove its unused API/import paths
only after checking callers, including any mobile or external clients. The external Alliance
website link on the dashboard is separate and remains available.

**Verify before enabling:** fetch a small jobs page, check pagination and error handling, then
use a disposable test job to verify import mapping and duplicate detection. Do not import or
modify customer jobs merely to test connectivity. This connection is intentionally left for
the developer at the owner's request.
