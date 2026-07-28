# InkType — architecture (local-first)

## Principles
1. **Keystrokes never wait on a model.** Live fill is deterministic client-side.
2. **Boxes, flows, architecture, edges are local.** `@inktype/diagram` owns geometry.
3. **Plugins + MCP + skills** are the real backend surface — not OpenClaw.
4. **OpenClaw is optional content-only** (`INKTYPE_ALLOW_LLM=1`) — title/bullets/nodes, never x/y/w/h.

See `docs/LOCAL_FIRST.md`.

## Components

```
┌──────── browser (apps/web) ────────┐
│  Preview ← core slots OR diagram   │
│  Export → POST /v1/render          │
└─────────────┬──────────────────────┘
              │
┌─────────────▼──────────────────────┐
│  apps/api (:3041)                  │
│  /v1/layout /plugins /render       │
│  /v1/structure (gated LLM)         │
│  packages: core · diagram · plugins│
│            render (Virgil/Rough)   │
└─────────────┬──────────────────────┘
              │
     ┌────────┴────────┐
     │ apps/mcp        │  agent tools = same local APIs
     │ skills/         │  how to use them
     └─────────────────┘
```

## Diagram layouts (`@inktype/diagram`)
| layout | Behavior |
|--------|----------|
| `flow` | Horizontal boxes + arrow edges; parses `A -> B` |
| `stack` | Vertical process |
| `arch` | Tiers; `A \| B` = siblings in a tier |
| `boxes` | Wrapped card grid |
| `auto` | Heuristic pick (still local) |

## OpenClaw boundary
Allowed: structure messy notes → ContentDoc fields + suggested template/layout id.  
Forbidden: coordinates, SVG, Rough options, edge lists.
