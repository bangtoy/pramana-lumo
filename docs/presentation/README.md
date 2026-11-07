# Pramana + Lumo — hackathon pitch

Open **[index.html](index.html)** in Chrome or Edge. The deck, local preview, and notes work without a server or internet connection. The separate application demo requires a connection.

- **8 pitch slides** plus **3 Q&A appendices**.
- **6-minute slot:** 330 seconds of planned content, including a **90-second app demo**, plus a **30-second reserve** for transitions or delays.
- **[Pramana-Lumo.pdf](Pramana-Lumo.pdf)** is the static 11-slide export.
- **[presenter-notes.html](presenter-notes.html)** contains the pitch script and demo cues.
- Application: **https://p2h.apta.works/**.

## Pitch story

Field operators sometimes provide unstructured or incomplete reports, without the information or evidence a supervisor needs. Supervisors then spend time asking follow-up questions and reconstructing the inspection.

Pramana guides the operator through a **pre-operational inspection**, asks for missing details or clearer evidence, and organizes the result into a structured report. The agent also generates **Work Orders** from report findings. For example, a flat tyre can produce a Work Order to purchase a replacement tyre. Supervisors monitor both inspection reports and Work Orders.

Generating a purchasing Work Order records a follow-up task. It does not execute a purchase. Report completeness supports supervisor review; it does not establish that the vehicle is safe. These boundaries apply to the pitch, without changing the application or its implementation.

## English terminology

- **Pre-operational inspection:** an inspection of the vehicle before operation. Use this phrase throughout the pitch.
- **Field operator:** the person inspecting the vehicle and reporting observations and evidence.
- **Inspection report:** the structured record of that inspection, including results, evidence, and any inspection exceptions.
- **Work Order:** a task generated from a report finding for follow-up, such as purchasing a replacement tyre.
- **Supervisor:** the person monitoring reports and Work Orders and retaining the operational decision.

The original product screenshots, capture records, application URLs, and source filenames retain their existing labels and identifiers. In screenshots, *Petugas* means Field operator, *Rencana Inspeksi* means Inspection Plan, *Laporan Inspeksi* means Inspection Report, and *Tanya Lumo* means Ask Lumo.

## Flow and timing

| Slide | Segment | Duration | Planned end |
| --- | --- | ---: | ---: |
| 1 | Product promise: complete reports, less follow-up | 15 sec | 00:15 |
| 2 | Problem: incomplete field reports and supervisor effort | 45 sec | 01:00 |
| 3 | Solution: field input, structured report, generated Work Order | 30 sec | 01:30 |
| 4 | Application demo: operator input to supervisor report | 90 sec | 03:00 |
| 5 | Differentiation, domain AI, and evidence rules | 40 sec | 03:40 |
| 6 | Value and pilot measurement plan | 40 sec | 04:20 |
| 7 | Execution and Codex workflow | 40 sec | 05:00 |
| 8 | Closing and next step | 30 sec | 05:30 |
| — | Reserve for transitions or delays | 30 sec | 06:00 |

The appendices cover architecture and responsibilities, evidence and validation boundaries, and the judging criteria map. They are outside the timed pitch. Timing metadata lives in [timing.json](timing.json).

## The 90-second demonstration

Prepare the application tabs and sample inputs before presenting. Focus on one vehicle and one inspection story:

1. **0–15 seconds:** identify the vehicle and selected inspection item.
2. **15–55 seconds:** show missing or unclear evidence, the agent's request for clarification, and the operator's response.
3. **55–80 seconds:** show the structured report and evidence in the supervisor view.
4. **80–90 seconds:** return to the deck and explain what the supervisor no longer has to reconstruct.

End the demo at the supervisor's report. Explain generated Work Orders on the solution and differentiation slides rather than adding procurement steps to this short demonstration.

Slide 4 provides three **scripted preview** stages: **Field input**, **Missing detail resolved**, and **Supervisor report**. These buttons switch among sample photos and a prepared deployment capture. They do not call a model, submit a report, or create a Work Order. The two application links open the field operator and supervisor views for the separate live demo. Clearly identify the preview if using it as a fallback. A clearer extinguisher label resolves one evidence gap; it does not complete every check or establish safety.

## Presenting controls

The deck opens in the gallery. Click **Start presentation** or a slide. **Grid** and **3D Gallery** options appear at the bottom. The current position is restored on refresh.

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

The timer starts when **Start presentation** is clicked. Opening an individual gallery slide does not start it. The timer covers the complete six-minute slot, including the reserve.

## Evidence and claim limits

The problem framing, English terminology, and generated Work Order example reflect the team's clarified product story. Supporting references include `../PRD.md`, `../CONTEXT.md`, ADRs, tickets, supplied UI references, and historical deployment captures.

The original captures show prepared plans and a report. The captured Work Order list was empty. The capture process did not exercise the full agent inspection or generate a purchasing Work Order. Design references, product intent, historical captures, and current live behavior are distinct evidence. See [product-facts.md](product-facts.md).

Supervisor time savings are an intended benefit. The pitch proposes a pilot measuring completeness at submission, review time, clarification requests, and time from a finding to a Work Order. No measured savings, accuracy, accident reduction, user count, revenue, or first-in-market claims are made. Repository workflow artifacts support the Codex segment; original session logs are needed for specific execution attribution.

## Editing and rebuilding

`scripts/build-slides.mjs` contains the slide content and timing. `shared/slides.css` preserves the existing Pramana design and adds scoped pitch adjustments. `shared/slide.js` controls presentation navigation and the local preview. `scripts/deck-template.html` supplies the existing gallery geometry.

```powershell
# From the repository root:
cd docs/presentation
npm ci
npm run slides
npm run thumbs
npm run verify
npm run export
```

The scripts use installed Chrome. To use Playwright Chromium, install it with `npx playwright install chromium`, then set `$env:PLAYWRIGHT_CHANNEL='chromium'`. On Windows with restricted PowerShell script execution, use `npm.cmd` in place of `npm`.

The generator removes only superseded slides, thumbnails, and slide verification images named by the previous generated manifest. It does not alter the application, product design assets, or original capture records. Copy the complete repository when moving the HTML version because supplied design images are referenced by relative paths. The PDF embeds its images and fonts.

Deck check results are in [verification/report.json](verification/report.json) and [verification/contact-sheet.jpg](verification/contact-sheet.jpg). They verify the presentation, not the hosted application.
