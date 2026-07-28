# Local-first stack (non-negotiable)

InkType is **not** an OpenClaw wrapper. Models are an optional content assistant.

## Decision tree

```
User types / uploads
        │
        ▼
┌───────────────────────┐
│  LOCAL (always)       │
│  @inktype/core        │  live slots / reflow
│  @inktype/diagram     │  boxes, flows, arch, edges
│  @inktype/render      │  Virgil + Rough → JPEG
│  plugins/*            │  pdf.js, tesseract, stencils
│  MCP / skills          │  agent-facing same tools
└───────────┬───────────┘
            │
            │ only if user asks "tidy / structure"
            │ or Pro "smart structure" is on
            ▼
┌───────────────────────┐
│  OPTIONAL OpenClaw    │
│  title + bullets only │  NEVER layout geometry
│  NEVER draw boxes     │  NEVER invent edges
└───────────────────────┘
```

## What OpenClaw may do
- Split messy pasted notes into `{ title, subtitle, bullets[], nodes[] }`
- Suggest a **template id** (`flow` | `arch` | `notebook` | …)
- Mentor caption for channel packages (insights-ops already owns voice)

## What OpenClaw must never do
- Place boxes / compute x,y,w,h
- Draw connectors / arrows
- Choose stroke geometry or Rough.js options
- Run per keystroke

## Runtime surfaces

| Surface | Path | Role |
|---------|------|------|
| Plugin registry | `packages/plugins` | Named capabilities the API loads |
| Diagram engine | `packages/diagram` | Deterministic scene graphs |
| MCP server | `apps/mcp` | Same tools for Cursor/Claude agents |
| Skills | `skills/*.md` | How agents should call local tools |
| API | `apps/api` | HTTP for web + channel |

## MCP tools (local)

- `inktype_list_templates`
- `inktype_parse_content` — regex/heuristics, no LLM
- `inktype_layout` — boxes/flow/arch from ContentDoc
- `inktype_render` — JPEG/PNG via Playwright
- `inktype_structure` — **gated**; OpenClaw only when `INKTYPE_ALLOW_LLM=1`

## Plugins (v1)

| id | Kind | AI? |
|----|------|-----|
| `layout.flow` | diagram | no |
| `layout.arch` | diagram | no |
| `layout.boxes` | diagram | no |
| `extract.text` | upload | no |
| `extract.pdf` | upload | no (pdf.js) |
| `extract.ocr` | upload | no (tesseract) |
| `stencil.system` | chrome | no (aretecode-inspired) |
| `content.structure` | optional | **yes** (OpenClaw) |

## Channel / portfolio
Same local diagram+render path. OpenClaw stays in insights-ops for *mentor captions* only — InkType draws the slide.
