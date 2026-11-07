# Lumo readability, data visualizations and panel width

The original reply combined prose, several unit histories and long report UUIDs
in one text bubble. The analyst now leads with a short answer, separates details
into paragraphs/lists, and puts source IDs in the source field. The UI renders
basic text emphasis and lists without HTML execution. Existing saved messages
also gain compact inline citations and readable source labels. Full source IDs
remain available in the expandable Sources section and its link titles.

## Data visualizations

- Added a read-only `chart_reports` tool using the same validated report filters
  as the dashboard. It counts the complete matching dataset, independently of
  the text search's 15-report limit. STOP counts are reports, not individual
  findings or proof of a unit's current condition.
- Supports bar, line, pie, table and KPI views. Lines group by day and include
  zero days; pies group by unit. Dates are inclusive Jakarta calendar dates with
  a 31-day limit. Unit charts show up to 12 groups and declare omitted groups;
  pie legends combine remaining groups into Other units without changing totals.
- Chart values come from the server tool, not model-supplied numbers. Optional
  fields extend the existing message contract, preserving old conversations.
  Chart snapshots persist with the answer. Compatible views can be switched in
  the UI; links open the underlying filtered reports.
- The unavailable-provider STOP fallback also produces a data chart. Tables,
  pies, KPIs and line charts can be requested for that fallback. Other fallback
  answers now use lists and separated paragraphs.

## Panel width

The left edge is a draggable separator. Desktop width ranges from 320 to 720 px,
bounded by available space. It preserves at least 320 px for the main content;
on narrow screens the panel fits the viewport. Width persists in localStorage,
including after refresh and collapse/expand. Arrow keys resize by 16 px,
Home/End select bounds, and double-click restores 360 px. The control has a
keyboard focus ring and announces its current/minimum/maximum width.

## Verification

- Real configured-model browser checks returned nine STOP reports across six
  units for 1–7 November 2026, matching the report API. A separate request
  generated a seven-day line chart with 27 inspection reports. Both responses
  retained valid source links and avoided raw report IDs in the answer text.
- All five visualizations, source disclosure/navigation, drag and keyboard
  resizing, refresh persistence, collapse/expand, and 390 px layout passed in
  Chrome. Legacy text became separate unit rows with compact citations. No
  console errors or failed requests were observed. See
  [browser evidence](lumo-readability-check.json).
- All 31 tests pass. Tests cover full-dataset counts, multiple STOP findings counted once per
  report, invalid dates/ranges/view combinations, zero days, omitted groups,
  persisted model/fallback chart snapshots, safe text formatting, source labels
  and unchanged report/work-order records. The real SDK against an unavailable
  provider also returned a saved pie-chart fallback with seven STOP reports in
  the isolated fresh seed. TypeScript and production Docker build pass. Both
  design-system scans are clean. No dependency was added.

Screenshots: [360 px panel](screenshots/lumo-bar-360-1440.png),
[resized bar chart](screenshots/lumo-bar-1440.png),
[line](screenshots/lumo-line-1440.png), [pie](screenshots/lumo-pie-1440.png),
[table](screenshots/lumo-table-1440.png), [KPI](screenshots/lumo-kpi-1440.png),
[mobile](screenshots/lumo-chart-390.png), [legacy reply](screenshots/lumo-legacy-1440.png).
