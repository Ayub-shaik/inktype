# Cursor session handoff

## Updated
2026-07-28T12:15:00Z

## Goal
Robust InkType with quotas + protected previews (guest/free/pro/admin).

## Status
done-for-now

## Done
- `@inktype/billing` — guest 1/1, free 10 exports + anti-stitch previews, Pro 300@₹260, admin ∞
- Preview: heavy watermark + bottom-half blur; family caps vs half-content misuse
- API: `/v1/pricing` `/v1/entitlements` `/v1/session` `/v1/preview` (402) `/v1/render` (402)
- Web: role switcher + Preview JPEG / Export + quota bar
- Hard tests: `npm test` → 22 passing
- Pushed to GitHub

## Next steps
1. Real auth (OAuth) instead of Bearer free:/pro: demo tokens
2. Payment (Razorpay) for Pro ₹260
3. pdf.js / tesseract plugins

## Gotchas
- Live canvas is free/local; gated path is server JPEG preview/export
- Channel `/v1/package` still internal (no consumer billing)

## Open decisions
- Whether free export stays watermarked (currently yes)
