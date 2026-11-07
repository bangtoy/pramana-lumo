# Andra chat polish merged with batch inspection photos

Date: 7 November 2026

Merged `origin/andra` (`5c5aa1f`) into `feat/batch-inspection-photos`
(`3ab8c1e`). The conflicts were in `InspectorChat.tsx` and
`inspector-ui-check.mjs`.

## Combined behavior

- Andra's growing composer, thin scrollbars, attachment cards, reduced-motion
  handling, and compact vehicle model on short viewports are retained.
- Users can type the next message while Lumo responds. A success or failure
  preserves that next draft; explicit retry sends the original text and photos.
- Up to five compressed photos remain supported. Every pending photo has a
  preview; failures restore the whole batch when the composer is empty.
- The checklist still appears after plan selection, before the unit is supplied.
  Progress cards keep unfinished components first. The searchable plan selector
  and exact-ID retry behavior remain available.
- Existing browser scripts now wait for a completed turn instead of assuming
  the composer is disabled while Lumo responds.

## Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | 46 passed, 0 failed |
| Design-system typography/color scans | No violations |
| `git diff --check` | Passed |
| Updated browser-script syntax checks | Passed |
| `inspector-polish-check.mjs` on development port 3001 | Passed; no console/page errors |
| Production or Docker build | Deferred at the user's explicit request |
| Docker deployment | Not performed; port 3002 retains its existing healthy container |

The browser suite intercepts report mutations and delayed NDJSON responses.
It verifies pending drafts, failed/successful retries, captured photo batches,
object-URL cleanup, exact plan IDs, component checklists, and layouts at widths
320, 390, and 1440. It also exercises 320×422 and 390×450 short viewports.
No real agent calls or report writes were made by this suite. Physical-phone
hardware and real agent responses were not re-tested for this UI merge.

The existing development server needed a CSS cache refresh before visual
comparison. The design-system source files remain unchanged.

Evidence:

- [Browser results](screenshots/andra-batch-merge/inspector-polish-check.json)
- [Five-photo draft at 390×844](screenshots/andra-batch-merge/inspector-batch-ready-390.png)
- [Pending attachment cards](screenshots/andra-batch-merge/inspector-batch-processing-390.png)
- [Saved photos at 1440×900](screenshots/andra-batch-merge/inspector-desktop-1440.png)
- [Checklist before unit entry](screenshots/andra-batch-merge/inspector-checklist-overview-390.png)
- [Remaining components](screenshots/andra-batch-merge/inspector-checklist-progress-390.png)
- [Short viewport](screenshots/andra-batch-merge/inspector-short-with-model-320x422.png)
