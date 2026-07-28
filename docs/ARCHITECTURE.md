# InkType — architecture

## Principles
1. **Keystrokes never wait on a model.** Live fill is deterministic client-side.
2. **Templates are data.** Chrome + slots + reflow rules, not hard-coded React pages.
3. **Uploads become plain text first**, then the same slot engine takes over.
4. **AI is a batch step** (structure / title / bullet split) on pause, blur, template change, or upload — not per character.

## Components

```
┌──────── browser (apps/web) ────────┐
│  PreviewCanvas  ← TemplateEngine   │
│  EditorPane (textarea + uploads)   │
│  TemplatePicker                    │
└─────────────┬──────────────────────┘
              │ uploads / AI structure / export
┌─────────────▼──────────────────────┐
│  API (later: services/api)         │
│  - PDF extract                     │
│  - OCR                             │
│  - optional LLM structure          │
│  - Pro export / billing            │
└────────────────────────────────────┘
```

## Template model (`packages/core`)

```ts
type Slot = {
  id: string;
  role: "title" | "subtitle" | "body" | "bullet" | "node" | "caption";
  // normalized box in template space 0..1
  x: number; y: number; w: number; h: number;
  maxChars?: number;
  style?: "title" | "body" | "mono" | "label";
};

type Template = {
  id: string;
  name: string;
  aspect: "story" | "square" | "wide"; // 1080x1350, 1080x1080, 1920x1080
  background: "paper" | "dark" | "grid";
  slots: Slot[];
  /** How raw text maps into slots */
  ingest: "lines" | "paragraphs" | "title-then-bullets";
};
```

## Live ingest
- Split on whitespace for “word by word” feel in the preview cursor
- Map accumulated text → slots via `ingest` rules
- Overflow → next body/bullet slot or scroll indicator (never silently drop without UX)

## Template switch / reflow
1. Extract semantic content: `{ title?, subtitle?, bullets[], nodes[], freeform }`
2. Rebind to target template slots by role priority
3. Truncate with ellipsis per `maxChars`; show “+N more” chip if needed

Inspired by semantic create/modify in [dtour/excalidraw-mcp](https://github.com/dtour/excalidraw-mcp) (server owns layout math).

## Rendering phases
| Phase | Renderer |
|-------|----------|
| MVP | DOM/CSS + Virgil + light Rough.js accents |
| v1.1 | Excalidraw element JSON in-memory → canvas/SVG |
| v1.2 | Export `.excalidraw` + optional MCP workbench |

## Upload pipeline
```
file → detect mime
  text/md     → editor value
  pdf         → pdf.js text items → editor
  image       → tesseract.js → editor
then optional AI: “split into title + bullets” → structured ContentDoc
```

## Android later
Trusted Web Activity wrapping `apps/web`, same APIs. Native only if we need camera/OCR performance or Play Billing edge cases.
