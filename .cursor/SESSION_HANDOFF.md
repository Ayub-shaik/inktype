# Cursor session handoff

## Updated
2026-07-28T11:25:00Z

## Goal
Ship InkType — public live text→template diagram tool (browser first, monetizable).

## Status
done-for-now

## Done
- Named product **InkType**; repo https://github.com/Ayub-shaik/inktype
- Path: `/home/shaik/Desktop/projects/inktype`
- Docs: PRODUCT, ARCHITECTURE, MONETIZATION, TOOLING
- `packages/core` live slot/reflow + notebook/flow/compare templates
- `apps/web` Next.js split UI on :3040 — build passes
- GitHub public repo created + pushed (`main`)

## Next steps
1. `npm run dev` locally; polish mobile UX + PNG export
2. PDF (`pdf.js`) + image OCR (`tesseract.js`)
3. Deploy domain + free/pro gating
4. Android TWA later

## Gotchas
- Live keystrokes stay client-side — no LLM per word
- MCPs for AI tidy/export later, not the type loop
- Next 14.2.35 (patched); still 2 audit highs in transitive deps

## Open decisions
- Domain (inktype.app vs tomorrowtools subdomain)
- Pricing finalize after first users
