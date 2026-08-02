/** Customer-facing labels — not internal template ids. */
export const TEMPLATE_LABELS: Record<string, { label: string; tag: string }> = {
  notebook: { label: "Handwritten notes", tag: "Notes" },
  flow: { label: "Horizontal flow", tag: "Flow" },
  stack: { label: "Vertical pipeline", tag: "Pipeline" },
  arch: { label: "Layer stack", tag: "Layers" },
  boxes: { label: "Card grid", tag: "Cards" },
  tree: { label: "Hierarchy tree", tag: "Tree" },
  compare: { label: "Side by side", tag: "Compare" },
};

export function templateLabel(id: string) {
  return TEMPLATE_LABELS[id]?.label || id;
}

/** Paper / ink surface styles (Pager Notes / Excalidraw prefs). */
export const PAPER_STYLES = [
  {
    id: "ruled",
    label: "Ruled notebook",
    hint: "Cream lined paper + red margin",
  },
  {
    id: "clipped",
    label: "Clipped scraps",
    hint: "Torn notes with tape",
  },
  {
    id: "sticky",
    label: "Sticky notes",
    hint: "Yellow sticky board",
  },
  {
    id: "messy",
    label: "Messy ink",
    hint: "Handwriting tilt + ink",
  },
  {
    id: "grid",
    label: "Grid paper",
    hint: "Engineering grid",
  },
  {
    id: "paper",
    label: "Plain paper",
    hint: "Clean cream sheet",
  },
  {
    id: "dark",
    label: "Night board",
    hint: "Dark chalk look",
  },
] as const;

export type PaperStyleId = (typeof PAPER_STYLES)[number]["id"];

export const FONT_STYLES = [
  { id: "virgil", label: "Hand ink (Virgil)" },
  { id: "serif", label: "Serif notes" },
  { id: "sans", label: "Clean sans" },
  { id: "mono", label: "Mono / terminal" },
] as const;

export type FontStyleId = (typeof FONT_STYLES)[number]["id"];
