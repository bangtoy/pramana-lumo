# Pramana P0 demo

This runbook covers PRD §10's P0 steps. Work orders (P1), daily dashboard metrics
(P2), and cross-report analysis / offline answers (P3) belong to later tickets.
The P0 dashboard opens Inspection reports; Ask Lumo is scoped to one finding.
Those later steps are not represented as implemented or tested here.

## Start and backup

From `pramana/`, configure `.env.local`, then run `docker compose up -d --build`.
Use `docker compose logs tunnel` for the phone URL. On this workstation the app
uses port 3002 and volume `pramana-p0-08-data`; see the deployment evidence.

Keep `/supervisor/laporan/LI-2026-10-29-DT07` ready in a second tab. This seeded
backup has tyre and brake-light STOP findings. Its offline export is
`inspection-DT07.pdf`; two additional complete reports are exported below.
The generated excavator is also retained in the Docker volume as
`MDL-e1f1323f-56dd-40f3-9c75-51b92c1a44ae` with the P0-08 audit evidence.

## Presenter sequence

1. Explain the problem with checking every box on a paper P2H form without proof.
2. Supervisor → Agent → New plan. Attach `test/dum-trcuk-spel.webp` (or the bundled
   `public/demo/spec-dump-truck.webp`). Ask for eight checks based on the sheet
   and standard. Explicitly select the U-type dump truck model. Inspect the
   sources, facts and STOP criteria; select Tyres to highlight the wheels.
3. Open the HTTPS Inspector page on a phone. Supply name, location, plan and unit.
   Send the distant extinguisher fixture and observe the request for a close-up.
   Use the camera or paperclip to provide the label photo. Explain which checks
   are visible and which require an operator's account / safe functional test.
4. Proceed through all eight items. The tyre bulge is a STOP. For this fixture
   simulation, the other seven checks are explicitly **unable to inspect**
   because safe access and qualified testing are unavailable; they remain STOP.
   A wide truck photo is never presented as proof that a safety system works.
5. Confirm submission. Open the new row under Inspection reports, show the tyre
   evidence and component colors, then download the A4 PDF.
6. Ask Lumo about the tyre finding. Show that the answer distinguishes visible
   evidence from the operator's account and cannot alter the inspection verdict.
   Mark handled / unresolved if desired; the original STOP remains in the record.
7. Show local trace metadata grouped by the report / plan ID. If the model is
   unavailable, open the saved backup report and PDF; P0 displays a clear model
   error and does not manufacture a fallback answer.

## Reproduce the automated journeys

With Playwright installed separately, set `PLAYWRIGHT_MODULE` to its `index.mjs`
and `PORT=3002`, then run `node scripts/integration-check.mjs` from `pramana/`.
The script creates real plans and submitted reports, uses real model calls,
uploads compressed images through the mobile UI, verifies every component focus,
reloads a draft, and exports the final PDFs. It has API usage costs.

`integration-check.json` contains timings and report IDs. `screenshots/last-check.json`
covers all ten user-facing routes at 1440×900 and 390×844. Physical camera and
gallery operation were separately confirmed by the user; browser emulation is
not represented as a physical-device test.

## Recorded runs — 7 November 2026

| Run | Inspection plan | Spec planning | Eight-item P2H | Whole P0 journey |
|---|---|---:|---:|---:|
| 1 | Seed `RI-DT-UTYPE-01` | 31.39 s | 130.40 s | 169.65 s |
| 2 | New Spec plan `RI-272e42d8-61a5-495a-a77f-1a50ff68e3a2` | 29.13 s | 123.70 s | 160.78 s |

Reports:

- Run 1: `LI-ee9abbcb-7a1d-470a-beb0-d716984c73db` — `demo-1-report.pdf`.
- Run 2: `LI-dfcb81e2-232f-4eca-8dad-12f0d16da30b` — `demo-2-report.pdf`.
- Backup: `LI-2026-10-29-DT07` — `inspection-DT07.pdf`.

Both journeys completed all eight items, requested a clearer photo, preserved
the draft on reload, and verified the reports, finding chat and PDFs. Run 2
included the two tyre photos required by its generated plan. All uploaded images
were below 300 KB. The first Spec request exceeded the 30-second target by 1.39
seconds; the second and the earlier P0-06 Spec check were below it.
