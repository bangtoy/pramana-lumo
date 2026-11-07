# Anatomy geometry toolkit

MIT-licensed kit and line-end verifier copied from the installed `anatomy` skill.
The application uses the supplied isometric truck solid geometry. The asset
preparation script uses Anatomy `fadeLineSvg` for tyre tread and fluid markings,
joins panel seams to their component outlines, and adds locking-handle end caps.
The original `design/assets/models` sources are retained unchanged.

Rebuild: `node scripts/prepare-models.mjs` from the application directory, with
Playwright available (or `PLAYWRIGHT_MODULE` pointing to its entry point).
Verify all 13 dump-body poses and both vehicle models in both themes using
`node scripts/model-art-check.mjs`. This checks projected SVG line joins; it does
not claim a world-space collision audit of the supplied precomputed geometry.

P0-08 will add the complete runtime skill bundle for the model-generation agent.
