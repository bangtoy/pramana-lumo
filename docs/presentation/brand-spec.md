# Pramana + Lumo presentation visual specification

## Assets and sources

- Pramana logo: the current Lumo face icon at `../../pramana/public/icon-lumo-face.png`, shared with the application homepage, supervisor sidebar, and manifest. Slide mastheads reference this local asset directly and render it at 40 ? 40 px with a 10 px radius.
- Lumo greeting: `../../design/assets/lumo/lumo-menyapa.png`.
- Lumo observing: `../../design/assets/lumo/lumo-mengamati.png`.
- Lumo completion: `../../design/assets/lumo/lumo-jempol.png`.
- Conversation avatar: `../../design/assets/lumo/lumo-avatar-netral.png`.
- Design screenshots: `../../design/screens/08-agent-item-terpilih.png`, `03-supervisor-laporan-detail.png`, `04-supervisor-work-order.png`, and `10-tanya-lumo-jawaban.png`.
- Current slide screenshots: `assets/screens/dump-truck-inspection.png`, `excavator-inspection.png`, and `supervisor-report.png`. Recaptured from the existing application records with the current Lumo face branding; adjacent capture JSON files record the source and checks. Historical product captures remain in `assets/live/`.
- Scenario evidence photos: `../../design/assets/demo/apar-jauh.jpg`, `apar-label.jpg`, and `ban-benjol.jpg`. Images are examples, not evidence from a new inspection.
- OpenAI logo for the Codex context: `assets/brand/openai.svg`. The download source is recorded in `assets/brand/source.json`. The existing mark is used without redrawing it.

## Tokens

`shared/tokens.css` copies `../../design/tokens.css` with one syntax change: `@theme` becomes `:root` so the browser can read it without Tailwind. The original design system file is unchanged.

- White surfaces, `--color-rail`, and `--color-border` / `--color-line` dividers.
- Text uses `--color-on-surface`, with secondary text in `--color-on-surface-muted`.
- Brand blue uses `--color-primary`, blue text uses `--color-on-accent-subtle`, and focused areas use `--color-accent-subtle`.
- Red is reserved for STOP / poor condition, green for improved evidence, and yellow for photo retake requests.
- Gradients come only from `--gradient-primary`, for identity and primary actions.
- Geist and Geist Mono typefaces, weights 400/500. Latin WOFF2 files from the Google Fonts distribution are stored locally for offline use.

## Presentation composition

The presentation follows the root README in six sections, from the opening question through Technology. The Demonstration section immediately precedes Technology and has a 90-second allocation. Existing Pramana typography, colours, and gallery styling frame the content. Current English screenshots in `assets/screens/` illustrate the dump-truck workspace, excavator workspace, and report. The demonstration includes a prepared preview with sample photos.

- Logical size: 1920 × 1080, with fitting and letterboxing for other viewports.
- One main title per page, body text around 30 px, and titles at 70–106 px depending on their role. This extends the app hierarchy for projection without changing app UI sizing.
- Models and photo evidence are the main content. Lumo supports the product evidence.
- White to light blue appears only on the closing slide and selected emphasis areas. No purple theme or new palette.
- Compositions include a cover with product bleed, problem statement, horizontal workflow, product screenshot, photo demonstration, rules table, three-column argument, and closing slide.
- No emoji icons, invented product images, decorative statistics, fictional testimonials, or skill watermarks.

## Demonstration system

The shell uses the `deck_index.html` template from the huashu-design skill. The tilted grid, infinite gallery, hit testing, and scaling are preserved. Labels use English, colors follow Pramana tokens, and the shell adds a timer, speaker notes, keyboard access, and cross-iframe messages for `file://` use. Product screenshots retain the original application's Indonesian labels.

## Visual review

The cover and evidence slide were prepared first as two sample page types. All slides were then rendered individually at 1920 × 1080 and combined into a contact sheet. Review changes moved the cover caption to avoid clipping and reduced the demo photo height to preserve the footer margin. Interaction and viewport results appear in `verification/report.json`.
