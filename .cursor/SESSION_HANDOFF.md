# Cursor session handoff

## Updated
2026-08-02T23:14:50Z

## Goal
Ship InkType as a canvas-first SaaS: paste → smart layout → handwritten-on-paper diagrams. Quality over paywall. Live: `https://inktype.tomorrowtools.dev`.

## Status
in progress

## Done
- Hierarchy paste: `packages/core/src/tree.js`, `packages/diagram/src/tree.js` + dotted splines `paths.js`; Rough + Virgil craft.
- Studio: `apps/web/app/studio/`, `StudioClient` / `CanvasBoard`; handcrafted `.excalidraw` export (`sceneToExcalidraw`).
- Marketing/auth/billing surfaces: about/contact/support/login/settings/billing pages; `packages/auth`, Dodo billing (`packages/billing/src/dodo.js`).
- Render: Rough HTML → Playwright JPEG (`packages/render`); paper styles in `shell.js`.
- CSS desk-photo craft (no local SD): grain + vignette + soft-warp in `shell.js` + studio `CanvasBoard`/`globals.css`.
- Excalidraw = export/interchange only; layout brain stays InkType.
- Fooocus local blocked (GTX 1650 4GB); guards in `tools/fooocus-mvp/`. Install ~13GB at `~/Desktop/projects/Fooocus`.
- automation handoff unrelated (Sreeraj); automation still has InkType client/CTA hooks when `INKTYPE_API_URL` set.
- Branch: `main` (matches origin tracking; large **uncommitted** studio/billing/auth/tree/craft work). Ports: API `3041`, web `3040`.

## Next steps
1. Visual QA studio + JPEG export — tune grain/vignette if too heavy.
2. Commit when ready (exclude `.env`; include studio/tree/render/craft/billing/auth).
3. Optional: delete local Fooocus (~13GB); remote GPU later for photo/doodle pass.

## Gotchas
- Guest header: `x-inktype-guest-key`. Live: `inktype-api` / `inktype-web` tunnel.
- Tree paste needs `├`/`└` (or deep indents). Tall exports can exceed 1350px height.
- Do not `transform` export `body` — clips Playwright; warp = inset overlays only.
- Do not run Fooocus locally unless MemAvailable ≥12GB.

## Open decisions
- Delete local Fooocus?
- Push CSS notebook-photo further vs wait for remote GPU?
- Owner admin vs free/Pro ledger (billing present, uncommitted).
