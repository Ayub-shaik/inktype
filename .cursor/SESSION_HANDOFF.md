# Cursor session handoff

## Updated
2026-07-28T12:00:00Z

## Goal
InkType local-first product — diagrams without OpenClaw; LLM only for content when gated.

## Status
in progress

## Done
- `docs/LOCAL_FIRST.md` decision tree
- `@inktype/diagram` — flow/stack/arch/boxes + edges (no AI)
- `@inktype/plugins` — registry; `content.structure` gated
- `apps/mcp` + `skills/inktype-local-diagram`
- API: `/v1/layout`, `/v1/plugins`, `/v1/structure` (403 unless `INKTYPE_ALLOW_LLM=1`)
- Web live preview for diagram templates
- Smoke flow JPEG OK; pushed to GitHub

## Next steps
1. Wire pdf.js / tesseract plugins for real
2. systemd for api; Cursor MCP config pointing at apps/mcp
3. Deploy domain

## Gotchas
- Default LLM off — structure endpoint returns 403 by design
- Shell `OPENCLAW_GATEWAY_HOST=host.docker.internal` irrelevant to InkType geometry

## Open decisions
- Domain; when to enable LLM for Pro tidy only
