# Cursor session handoff

## Updated
2026-07-28T11:20:00Z

## Goal
Ship InkType — public live text→template diagram tool (browser first, monetizable).

## Status
in progress

## Done
- Named product **InkType**; scaffold at `/home/shaik/Desktop/projects/inktype`
- Docs: PRODUCT, ARCHITECTURE, MONETIZATION, TOOLING (MCP/repo choices)
- `packages/core` live slot/reflow + 3 templates (notebook/flow/compare)
- `apps/web` Next.js split UI (preview top / type bottom) on :3040
- Workspaces + @inktype/core link; build in progress / push pending

## Next steps
1. Finish npm build; `gh repo create` + push `Ayub-shaik/inktype`
2. PDF extract + image OCR stubs → real (pdf.js / tesseract.js)
3. PNG export (html-to-image), PWA, deploy domain
4. Android TWA later

## Gotchas
- Live keystrokes stay client-side — no LLM per word
- MCPs (dtour/yctimlin/official) are for AI tidy / export later, not the type loop
- Next was 14.2.15 (vuln) — bump toward patched 14.2.x

## Open decisions
- Domain (inktype.app vs tomorrowtools subdomain)
- Pricing tiers finalize after first users
