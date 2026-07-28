---
name: inktype-local-diagram
description: >
  Build InkType diagrams with the LOCAL stack only. Use MCP tools
  inktype_parse_content, inktype_layout, inktype_render. Never ask a model
  for box coordinates or edges. OpenClaw (inktype_structure) only when the
  user explicitly wants messy notes cleaned — and then only for title/bullets.
---

# InkType local diagram skill

## Rules
1. Keystrokes / live preview → `@inktype/core` (client) — no MCP needed.
2. Boxes, flows, architecture tiers, arrows → `inktype_layout` (deterministic).
3. JPEG export → `inktype_render`.
4. Do **not** call `inktype_structure` unless the user asks to “tidy/structure” messy prose AND `INKTYPE_ALLOW_LLM=1`.
5. After any structure call, still run `inktype_layout` for geometry.

## Layout cheatsheet
| Content | layout |
|---------|--------|
| Steps / process / `A -> B -> C` | `flow` |
| FE / API / DB layers (use `\|` siblings) | `arch` |
| Many peer concepts | `boxes` |
| Top-down steps | `stack` |

## Example agent flow
```
inktype_parse_content({ text })
inktype_layout({ doc, layout: "arch" })
inktype_render({ template: "arch", content: doc })
```
