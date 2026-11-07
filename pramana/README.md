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
