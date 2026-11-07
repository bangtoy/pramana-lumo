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
This P0 demo has no login; use demo data with the public tunnel.

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
P0-00 through P0-13. Work orders, daily metrics and cross-report analysis remain
P1–P3; the P0 finding chat answers questions about a single finding.
