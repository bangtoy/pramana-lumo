# Product facts and evidence status

Review date: 7 November 2026. This document supports the presentation content. It is not a production readiness report.

## Sources reviewed

- `../../README.md`: Pramana design kit and documentation.
- `../PRD.md`: PRD v2.0, 6 November 2026, covering dump truck P2H, P0–P3 priorities, demo script, targets, and non-goals.
- `../CONTEXT.md`: domain terms used in the deck.
- `../../design/DESIGN_SYSTEM.md`, `tokens.css`, and `design/screens/`: visual sources.
- Implementation repo: `C:/Users/AndraApta/Desktop/projects/2026/next/pramana`, branch `lumo-design`, commit `c70e025`.
- Source reviewed: `pramana/lib/rules.ts`, `pramana/lib/agents/inspektor.ts`, `pramana/lib/agents/analis.ts`, and `pramana/lib/work-order.ts` on that branch.
- User-supplied deployment: [Pramana](https://p2h.apta.works/). Captures and navigation results appear in `assets/live/capture.json`.
- [Official Indonesia hackathon guide](https://seaxopenai-hackathon-id.sea.com/): source for build direction names. The page requires JavaScript. Indexed excerpts and organizer pages mention Autonomous & Adaptive AI, AI-Native Products & Operations, and Deep Domain AI. The project-to-track mapping is an editorial assessment based on PRD features.

A public search for the exact name `pramana-lumo` did not produce a verified product page with stronger evidence than the user's repo. Feature status therefore relies on the user-specified repo and deployment, rather than assumptions based on the product name or model memory.

## What was visible on the deployment

| Page | Observation |
| --- | --- |
| `/` | Role entry page for Supervisor and Inspector, with the title Pramana · P2H. |
| `/supervisor/laporan` | Sample report `LI-2026-10-29-DT07` for DT-07, with a not-roadworthy verdict. |
| `/supervisor/laporan/LI-2026-10-29-DT07` | Eight items: five good, two poor, and one unable to inspect. Two STOP conditions, photo evidence, and a button to create a Work Order. |
| `/supervisor/rencana` | An eight-item sample U-type dump truck plan and another six-item plan. |
| `/supervisor/agent?rencana=RI-DT-UTYPE-01` | Vehicle Model, eight items, P2H Standard / Spec Sheet sources, required evidence, and STOP conditions. |
| `/supervisor/work-order` | Page accessible, with no Work Orders at capture time. |
| `/supervisor` | Redirects to `/supervisor/laporan`. Summary v2 was not established as active. |
| `/petugas` | The initial visit showed a Pak Pramana greeting. A recapture with API mutations blocked remained on “Menyiapkan P2H…” (“Preparing P2H…”). No chat or report submission took place. |

No JavaScript `pageerror` errors occurred on the reviewed pages. This does not establish that all interactions, models, vision, or failure handling passed end-to-end tests.

On the initial visit, `/supervisor/agent` without an ID initialized an empty draft, `RI-MW4YVWW5CY0`. The draft was confirmed empty with the title “Rencana baru” (“New plan”), then archived. The capture script was subsequently changed to open an existing seeded plan and block API mutations. No chat, inspection submission, or Work Order creation took place during evidence collection.

Product screenshots and capture records retain the application's original Indonesian labels. The presentation translates the surrounding explanations and interface controls into English.

## Lumo implementation source

- `evidenceProblem()` rejects unknown photo IDs and results missing required photos. The `tidak_bisa_diperiksa` (unable to inspect) status requires a reason. These are completeness checks. They do not establish photo authenticity or guarantee vision assessment accuracy.
- Code calculates progress and item order. `submit_report` checks completeness before changing report status.
- `updateWorkOrder()` synchronizes finding handling status with the Work Order. Handling does not automatically establish vehicle roadworthiness.
- The Analyst agent uses read-only data tools. Source IDs are filtered to records that actually exist. `jawabCadangan()` produces answers and recommendations from data when the agent fails.
- The reviewed Lumo source differs in scope from the deployment. The deck distinguishes these types of evidence.

## Claim limits

- PRD targets: a plan with ≥8 items in <30 seconds and an 8-item P2H inspection in <4 minutes. These were not measured in this work.
- No pilot results, accident statistics, accuracy rates, competitor study, user counts, revenue, or savings results.
- No claim that this product concept is first in the market.
- Tickets, prompts, contracts, ADRs, Definition of Done, and source are available as Codex workflow artifacts. Session logs and attribution of individual commits to Codex have not been provided.
- Configured model names and library versions are not presented as public release claims in the slides.
