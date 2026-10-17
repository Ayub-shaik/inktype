2026-09-10 07:10 IST — # Cursor session handoff

2026-09-10 07:10 IST — ## Updated
2026-09-10 07:10 IST — 2026-09-10T07:10:00+05:30 (restamp; last real work 2026-08-02)

2026-09-10 07:10 IST — ## Goal
2026-08-02 23:14 IST — Ship InkType as canvas-first SaaS: paste → smart layout → handwritten-on-paper diagrams. Live: `https://inktype.tomorrowtools.dev`.

2026-09-10 07:10 IST — ## Status
2026-08-02 23:14 IST — in progress

2026-09-10 07:10 IST — ## Done
2026-08-02 23:14 IST — Hierarchy paste: `packages/core/src/tree.js`, `packages/diagram/src/tree.js` + dotted splines
2026-08-02 23:14 IST — Studio: `apps/web/app/studio/`, `StudioClient` / `CanvasBoard`; Excalidraw export
2026-08-02 23:14 IST — Marketing/auth/billing pages; Dodo billing (`packages/billing/src/dodo.js`)
2026-08-02 23:14 IST — Render: Rough HTML → Playwright JPEG; CSS desk-photo craft (no local SD)
2026-08-02 23:14 IST — Fooocus local blocked (GTX 1650 4GB); install ~13GB at `~/Desktop/projects/Fooocus`
2026-08-02 23:14 IST — Branch `main`; large uncommitted studio/billing/auth/tree/craft; ports API `3041`, web `3040`

2026-09-10 07:10 IST — ## Next steps
2026-08-02 23:14 IST — 1. Visual QA studio + JPEG export — tune grain/vignette if too heavy
2026-08-02 23:14 IST — 2. Commit when ready (exclude `.env`)
2026-08-02 23:14 IST — 3. Optional: delete local Fooocus (~13GB)

2026-09-10 07:10 IST — ## Gotchas
2026-08-02 23:14 IST — Guest header: `x-inktype-guest-key`
2026-08-02 23:14 IST — Tree paste needs `├`/`└` (or deep indents)
2026-08-02 23:14 IST — Do not `transform` export `body` — clips Playwright
2026-08-02 23:14 IST — Do not run Fooocus locally unless MemAvailable ≥12GB

2026-09-10 07:10 IST — ## Open decisions
2026-08-02 23:14 IST — Delete local Fooocus?
2026-08-02 23:14 IST — Push CSS notebook-photo further vs wait for remote GPU?
2026-08-02 23:14 IST — Owner admin vs free/Pro ledger (billing present, uncommitted)
