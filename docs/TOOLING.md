# Backend tool decisions

What we reuse from the Excalidraw ecosystem research — and what we build ourselves.

## Build ourselves
| Piece | Reason |
|-------|--------|
| Live slot / reflow engine | Product core; must be instant and offline-capable |
| Mobile split UI | Unique UX wedge |
| Template pack format | Product IP |

## Adopt / adapt
| Piece | Source | Role |
|-------|--------|------|
| Semantic layout ideas | [dtour/excalidraw-mcp](https://github.com/dtour/excalidraw-mcp) | Reflow when templates change |
| Agent canvas (future) | [yctimlin/mcp_excalidraw](https://github.com/yctimlin/mcp_excalidraw) | Internal tooling / Pro “AI tidy” |
| Chat diagram widget (future) | [excalidraw/excalidraw-mcp](https://github.com/excalidraw/excalidraw-mcp) | Optional embed, not core loop |
| Mermaid → scene (optional) | [debu-sinha/excalidraw-mcp-server](https://github.com/debu-sinha/excalidraw-mcp-server) | Power-user paste path |
| System-design stencils | [aretecode/…](https://github.com/aretecode/system-design-templates-excalidraw) | Template chrome |
| Threat-model shapes | [sergey-pronin/…](https://github.com/sergey-pronin/excalidraw-threatmodeling) | Security template pack |
| Scene composition refs | [swaymun/…](https://github.com/swaymun/system-design-excalidraws) | Design reference only |
| Font heritage | [excalidraw/virgil](https://github.com/excalidraw/virgil) | Hand-ink feel (Excalifont later) |
| Collab server | [excalidraw/excalidraw-room](https://github.com/excalidraw/excalidraw-room) | Phase-2 multiplayer |
| Template authoring | [obsidian-excalidraw-plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin) | Internal design vault |

## Do not depend on for v1 runtime
- Obsidian as a required client
- AFFiNE as host
- Per-keystroke LLM calls
- Full Excalidraw editor chrome (keeps UX simple; export into Excalidraw later)
