# InkType

**Type it. Watch it become a diagram — live.**

Mobile-first public tool: the top half of the screen is a live template preview; the bottom half is where you type. Words stream into the chosen template as you go. Switch templates anytime — layout reflows intelligently. Upload text, images, or PDFs to seed the canvas.

> Status: greenfield MVP (browser first). Android later. Built to be a real paid product.

## Product in one screen

```
┌─────────────────────────────┐
│  TEMPLATE PREVIEW (live)    │
│  ┌───────────────────────┐  │
│  │  handwritten / system │  │
│  │  design / notes …    │  │
│  └───────────────────────┘  │
│  [ notebook ▾ ] [ export ]  │
├─────────────────────────────┤
│  TYPE HERE                  │
│  words appear above live…   │
│  📎 upload text / image / PDF│
└─────────────────────────────┘
```

## Why this can earn

| Free | Pro |
|------|-----|
| 3 starter templates | Full template library |
| Live typing → preview | Smart reflow + AI structure |
| PNG export (watermarked) | Clean PNG/SVG/PDF + `.excalidraw` |
| 1 upload / day | Bulk OCR + PDF extract |
| Local-only sessions | Saved boards + share links |

Not “another AI chat that draws once.” The wedge is **live typing into a designed canvas** — addictive on mobile, sticky for students, creators, and engineers.

## Repo layout

```
inktype/
  apps/web/           # Next.js browser app (:3040)
  apps/api/           # Render API (:3041) — product + channel
  packages/core/      # live slot / reflow engine
  packages/render/    # Virgil + Rough.js → Playwright JPEG
  docs/               # product, architecture, channel integration
```

## Backend / tool stack (chosen)

Live keystrokes must stay **client-side**. Round-tripping an LLM on every word is too slow and too expensive.

| Job | Tool / approach | Why |
|-----|-----------------|-----|
| Word-by-word live fill | `packages/core` slot engine | Instant; no API cost |
| Template switch + reflow | Semantic layout (inspired by [dtour/excalidraw-mcp](https://github.com/dtour/excalidraw-mcp)) | Server owns coordinates; client swaps chrome |
| Hand-drawn look | Virgil / Excalifont + Rough.js (same craft as Pager Notes) → later real Excalidraw JSON | Proven look; editable scenes later |
| Shape libraries | [aretecode system-design templates](https://github.com/aretecode/system-design-templates-excalidraw), [threat-modeling lib](https://github.com/sergey-pronin/excalidraw-threatmodeling) | Ready DevOps / DFD chrome |
| Layout inspiration | [swaymun/system-design-excalidraws](https://github.com/swaymun/system-design-excalidraws) | Composition patterns |
| Upload → text (PDF) | `pdf.js` (browser) + optional server `pypdf` | Fast path for docs |
| Upload → text (image) | `tesseract.js` MVP → Pro cloud OCR | Offline-capable free tier |
| AI structure (optional) | OpenClaw / OmniRoute / any LLM — **on pause / template change / upload only** | Not per keystroke |
| Agent canvas (future) | [yctimlin/mcp_excalidraw](https://github.com/yctimlin/mcp_excalidraw) or official [excalidraw/excalidraw-mcp](https://github.com/excalidraw/excalidraw-mcp) | Workbench / chat widget |
| Collab (future) | [excalidraw/excalidraw-room](https://github.com/excalidraw/excalidraw-room) | Self-hosted live rooms |
| Authoring vault (internal) | [Obsidian Excalidraw plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin) | Design new templates offline |

**Explicitly not the core path:** Obsidian as end-user runtime, AFFiNE as host app, or `excalidraw-room` for v1 (collab is a Pro phase-2 feature).

## Quick start

```bash
npm install
npm run start:api    # :3041 — JPEG render + /v1/package for LI/WA/portfolio
npm run dev          # :3040 — browser app (Export calls API)
```

Channel wiring: [`docs/CHANNEL_INTEGRATION.md`](docs/CHANNEL_INTEGRATION.md)

## Roadmap

1. **MVP (now)** — split UI, live fill, API JPEG export, channel `/v1/package`
2. **Uploads** — PDF (`pdf.js`) / image OCR (`tesseract.js`)
3. **Pro** — accounts, saved boards, watermark removal, more templates
4. **Excalidraw export** — real `.excalidraw` scenes
5. **Android** — TWA over the same web core
6. **Collab rooms** — optional self-hosted room server

## License

Proprietary for now (public repo, product rights reserved). Open-core decision later.
