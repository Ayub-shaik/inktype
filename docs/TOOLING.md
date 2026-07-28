# Backend tool decisions (local-first)

## Build ourselves (default path)
| Piece | Package | AI? |
|-------|---------|-----|
| Live slots / reflow | `@inktype/core` | no |
| Boxes / flows / arch / edges | `@inktype/diagram` | no |
| Plugin registry | `@inktype/plugins` | mostly no |
| Virgil + Rough JPEG | `@inktype/render` | no |
| HTTP API | `apps/api` | no |
| MCP server | `apps/mcp` | tools local |
| Agent skill | `skills/inktype-local-diagram` | instructs local |

## OpenClaw (exception only)
| Piece | When |
|-------|------|
| `content.structure` plugin | `INKTYPE_ALLOW_LLM=1` + user asks to tidy notes |
| Channel mentor captions | Still owned by insights-ops, not InkType geometry |

## Adopt later (chrome / export — still local runtime)
| Piece | Source | Role |
|-------|--------|------|
| Semantic layout ideas | dtour/excalidraw-mcp | Inspired `@inktype/diagram` |
| System-design stencils | aretecode | Template chrome packs |
| Threat shapes | sergey-pronin | Security pack |
| Font | Virgil / Excalifont | Hand-ink |
| Collab | excalidraw-room | Phase 2 |
| Agent canvas | yctimlin / official MCP | Optional Pro tidy UI — not core loop |

## Explicit non-goals
- Routing InkType work “through OpenClaw” by default
- Asking a model to invent box positions
- Obsidian / AFFiNE as required runtime
