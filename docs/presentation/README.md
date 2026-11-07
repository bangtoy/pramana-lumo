# Pramana + Lumo presentation

Open [index.html](index.html) in Chrome or Edge. The deck follows the root [README.md](../../README.md) from its opening question through Technology.

## Sequence and timing

| Slide | Section | Duration | Planned end |
| --- | --- | ---: | ---: |
| 1 | What if inspections, surveys, and reporting were supported by a proactive AI agent? | 40 seconds | 00:40 |
| 2 | The problem | 55 seconds | 01:35 |
| 3 | The solution | 55 seconds | 02:30 |
| 4 | What you can do | 55 seconds | 03:25 |
| 5 | Demonstration | 90 seconds | 04:55 |
| 6 | Technology | 35 seconds | 05:30 |
| | Transition reserve | 30 seconds | 06:00 |

The demonstration immediately precedes Technology. The planned content totals 330 seconds within a six-minute slot. Timing metadata is stored in [timing.json](timing.json).

[Pramana-Lumo.pdf](Pramana-Lumo.pdf) contains the six-slide static export. [presenter-notes.html](presenter-notes.html) provides the spoken script and demonstration cues.

## Content and images

The opening, problem, solution, five capabilities, and technology stack follow the root README. The opening uses its inspection workspace image from `docs/verification/screenshots/`. The solution uses the presenter’s excavator screenshot stored in `assets/screens/excavator-inspection.png`.

The capabilities cover building inspection plans, inspecting on a phone, reviewing results, managing follow-up, and asking Lumo questions with cited sources. Technology covers the application stack, OpenAI Agents SDK, Zod and inspection rules, SQLite and local artifacts, the Anatomy geometry workflow, English UI, and Jakarta operational dates.

## Demonstration

The demonstration uses a pre-operational inspection as the application example. Prepare the operator and supervisor tabs before presenting.

1. Identify the vehicle and selected inspection item in the first 15 seconds.
2. Show evidence collection, a clarification request, and the operator response over 40 seconds.
3. Review the report and evidence in the supervisor view over 25 seconds.
4. Return to the presentation over 10 seconds and continue to Technology.

The slide provides a prepared preview with sample photos and an existing English report screenshot. Its three buttons select Field input, Missing detail resolved, and Supervisor report. The application links open the field operator and supervisor views at [p2h.apta.works](https://p2h.apta.works/). Identify the prepared preview when using it during the presentation.

## Controls

Click Start presentation to begin the six-minute timer. Click any gallery slide to open that section. The gallery supports Grid and 3D Gallery views, and navigation restores the last slide on refresh.

| Key | Action |
| --- | --- |
| Arrow keys or PageUp / PageDown | Change slides |
| Space | Next slide while the slide has focus |
| Home / End | First or last slide |
| Esc | Return to gallery |
| F | Fullscreen |
| N | Toggle speaker notes |
| T | Start or pause timer |
| R | Reset timer |

## Rebuilding

`scripts/build-slides.mjs` holds the source content. `shared/slides.css` controls the existing presentation styling, and `shared/slide.js` manages slide navigation and preview stages.

```powershell
cd docs/presentation
npm ci
npm run slides
npm run thumbs
npm run verify
npm run export
```

The browser scripts use installed Chrome. The generator updates the manifest, notes, and timing file and removes superseded artifacts named by the previous manifest. The HTML version references repository screenshots and design assets by relative path, so copy the full repository when moving it. The PDF embeds the images and fonts.

Presentation verification results are saved in [verification/report.json](verification/report.json) and [verification/contact-sheet.jpg](verification/contact-sheet.jpg).
