# Pramana + Lumo — 6-minute presentation

Open **[index.html](index.html)** in Chrome or Edge. Reading the deck and using the photo simulation require no server, build process, or internet connection. Opening the demo app requires a connection.

- **12 main slides**, with **360 seconds including the demo**.
- **3 appendix slides** covering architecture, evidence status, and the judging criteria map.
- **[Pramana-Lumo.pdf](Pramana-Lumo.pdf)** is a static copy of all 15 slides.
- **[presenter-notes.html](presenter-notes.html)** contains the script, timing, and demo guidance for each slide.
- App: **https://p2h.apta.works/**.

## Presenting

The deck opens in the 3D gallery. Click **Start presentation** or any slide. **Grid** and **3D Gallery** options appear at the bottom. The current slide is saved as you navigate and restored on refresh.

| Key | Action |
| --- | --- |
| `→` / `←`, `PageDown` / `PageUp` | Change slides |
| `Space` | Next slide, except when an interactive button has focus |
| `Home` / `End` | First / last slide |
| `Esc` | Return to the gallery |
| `F` | Fullscreen |
| `N` | Open / close speaker notes |
| `T` | Start / pause the six-minute timer |
| `R` | Reset the timer |

The timer starts when you click **Start presentation**. Opening an individual slide from the gallery does not automatically start the timer. Appendix slides sit outside the six-minute allocation.

The photo evidence slide has three buttons: **Distant photo → Retake photo → Tire bulge**. This is a scripted simulation using sample photos from the repo, without a live vision model call. The follow-up slide switches between a live report capture, a Work Order reference, and an Ask Lumo reference.

The presentation copy, controls, and speaker notes use English. Product screenshots and the original capture records retain the application's Indonesian labels. P2H means Daily Inspection and Maintenance. In the screenshots, *Petugas* means Inspector, *Rencana Inspeksi* means Inspection Plan, *Laporan Inspeksi* means Inspection Report, and *Tanya Lumo* means Ask Lumo.

## Flow and timing

| Main slide | Content | Duration | End |
| --- | --- | ---: | ---: |
| 1 | P2H backed by evidence | 20 sec | 00:20 |
| 2 | The problem with checkmarks and insufficient evidence | 25 sec | 00:45 |
| 3 | The workflow from Spec Sheet to action | 25 sec | 01:10 |
| 4 | Inspection Plan demo | 35 sec | 01:45 |
| 5 | Adaptive photo evidence demo | 50 sec | 02:35 |
| 6 | Reports and follow-up | 40 sec | 03:15 |
| 7 | Reliability: rules in code | 30 sec | 03:45 |
| 8 | Insight: continuous context | 25 sec | 04:10 |
| 9 | Users, benefits, and validation targets | 25 sec | 04:35 |
| 10 | Deep Domain AI and AI-Native Products & Operations | 20 sec | 04:55 |
| 11 | Development workflow with Codex | 30 sec | 05:25 |
| 12 | Closing and app link | 35 sec | 06:00 |

## Content sources and claim limits

Content follows `../PRD.md`, `../CONTEXT.md`, ADRs, and P0–P3 tickets. The design uses `../../design/`: Geist / Geist Mono, weights 400/500, white, blue, thin lines, and red for STOP. Text is scaled for 1920 × 1080 projection. The application's design system files are unchanged.

Deployment screenshots live in `assets/live/`. Lumo UI references still link directly to `../../design/screens/`. Copy the **complete repo** when moving the HTML version. The PDF embeds images and fonts.

During deployment review, the agent still used the name **Pak Pramana**. A sample STOP report and Inspection Plans were available, the Work Order page was empty, and `/supervisor` redirected to the report list. The Summary reference, populated Work Orders, and Ask Lumo screens in the design kit do not establish that all those features were active on the deployment. See [product-facts.md](product-facts.md) for detailed status.

The figures `<30 seconds` and `<4 minutes` are **PRD targets**, not measured results. There are no claims about vision accuracy, incident reduction, customer counts, savings, or the percentage of code written by Codex. The repo includes Codex workflow artifacts, but session logs attributing specific implementations have not been provided. Add original session evidence if the team has it.

## Editing or rebuilding

`scripts/build-slides.mjs` is the content source. `shared/slides.css` controls layout, and `shared/slide.js` controls slide interactions. `scripts/deck-template.html` is the gallery template from huashu-design. Its gallery geometry and fit behavior are preserved.

```powershell
# From the repository root:
cd docs/presentation
npm ci
npm run slides
npm run thumbs
npm run verify
npm run export
```

The browser scripts use the installed Chrome browser. To use Playwright Chromium, run `npx playwright install chromium`, then set `$env:PLAYWRIGHT_CHANNEL='chromium'` before running the commands. Dependencies are only needed for development, screenshots, and export. Opening the HTML does not require them.

`npm run capture` refreshes deployment screenshots using existing sample routes. The script blocks API requests other than GET/HEAD/OPTIONS. Do not open `/supervisor/agent` without a plan ID for screenshots: that page initializes a draft on load.

Deck check results appear in **[verification/report.json](verification/report.json)** and **[verification/contact-sheet.jpg](verification/contact-sheet.jpg)**. Deck verification is separate from end-to-end application testing.
