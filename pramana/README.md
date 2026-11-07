# Pramana

Evidence-led P2H vehicle inspections with Lumo. The application UI is in English;
timestamps use Asia/Jakarta. The domain's stable JSON identifiers are Indonesian.

## Local development

Requires Node.js 22.5 or newer (22.19+ recommended).

```sh
npm ci
npm run dev
```

Open the address printed by Next.js. Copy `.env.example` to `.env.local` and set
the model endpoint and key for agent features. Secrets stay on the server.

SQLite is initialized on the first data request. Documents and uploads live in
`DATA_DIR` (default `./data`); demo files are bundled under `public/demo`.

```sh
npm run seed:if-empty
npm test
npm run typecheck
npm run build
```

To reset the demo database, **stop the application first**, then run `npm run seed`.
The previous database is moved to a timestamped backup inside DATA_DIR. Uploaded
files are preserved. `seed:if-empty` is safe on an existing database.

Visual checks: `node scripts/ui-check.mjs /` with Playwright installed separately,
or `PLAYWRIGHT_MODULE` pointing to its `index.mjs`. Set `PORT` if needed.

## Docker and phone access

Requires Docker with Compose 2.24 or newer. From this directory:

```sh
docker compose up -d --build
docker compose logs tunnel
```

Open `http://localhost:3000` locally, or the HTTPS `trycloudflare.com` address
printed by the tunnel service on a phone. Choose **Inspector** for the mobile
inspection flow. Its composer supports both camera capture and image attachments
from the gallery or files; both are compressed before upload.

Compose loads optional `.env` and then `.env.local`. Your `.env.local` model/key
settings take precedence. If neither file supplies `OPENAI_BASE_URL`, the image
uses `http://host.docker.internal:20128/v1`. Set a key and the appropriate model
names for that endpoint. Environment files are excluded from the image and Git.

SQLite, evidence, generated models and local traces persist in the `pramana-data`
volume. `docker compose down` preserves it; `seed:if-empty` preserves existing
records on restart. The tunnel URL is temporary and changes when recreated.
This demo has no login; use demo data with the public tunnel.

If port 3000 is occupied, choose another port before starting:

```powershell
$env:PRAMANA_PORT = '3002'
docker compose up -d --build
```

`PRAMANA_VOLUME` can select an existing data volume. Keep that setting consistent
across Compose commands. Container health is available in `docker compose ps`;
application logs are available through `docker compose logs app`.

References: [Compose environment files](https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/)
and [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

## Verification and demo

The [P0 evidence log](../docs/verification/P0.md) records per-ticket checks;
the [P0 demo runbook](../docs/verification/DEMO-P0.md) lists the presenter flow,
real-agent integration results and backup report. The implementation covers
P0-00 through P0-13, P1-01 through P1-04 and P2-01 through P2-05. See the
[P1 evidence log](../docs/verification/P1.md) for work-order checks and the demo
flow, and the [P2 evidence log](../docs/verification/P2.md) for dashboard and report
search checks. Cross-report analysis remains P3; the existing finding chat
answers questions about a single finding. The dashboard's right panel currently
offers report/work-order shortcuts.

From a submitted inspection report, choose **Create work orders** to draft one
repair instruction per unassigned Not good finding. If the model is unavailable,
the server uses the finding's original note. STOP findings are high priority and
due today in Jakarta; other findings are medium priority and due in two days.
In **Work orders**, assign a mechanic, set a target, and complete with a note.
Completion and reopening synchronize with the linked finding. These actions
record repair follow-up; the original inspection verdict and STOP remain intact.

Open **Summary** at `/supervisor` for today's fleet status, open/overdue work
orders, the 7/14-day trend and recurring component findings. STOP and component
links open **Inspection reports** with filters in the URL. Combine unit,
inspector, inclusive Jakarta dates, STOP, open WO and component filters; refresh
keeps the selection. Unit search applies on Enter or when leaving the field.

Existing databases receive 46 history reports and 11 work orders exactly once.
Their dates are relative to the first P2 startup and remain stable on subsequent
restarts; the history is not moved forward each day. Today’s DT-07 initially has
two STOP findings without work orders. The recorded dashboard test created both
orders in the live demo database, so its current no-WO KPI is zero. Existing demo
reports also contribute to live totals; fresh-seed acceptance numbers are tested
separately without resetting that data.
