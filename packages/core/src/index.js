/** @typedef {'title'|'subtitle'|'body'|'bullet'|'node'|'caption'} SlotRole */

/**
 * @typedef {object} Slot
 * @property {string} id
 * @property {SlotRole} role
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 * @property {number} [maxChars]
 * @property {'title'|'body'|'mono'|'label'} [style]
 */

/**
 * @typedef {object} Template
 * @property {string} id
 * @property {string} name
 * @property {string} blurb
 * @property {'story'|'square'|'wide'} aspect
 * @property {'paper'|'dark'|'grid'} background
 * @property {'lines'|'paragraphs'|'title-then-bullets'} ingest
 * @property {Slot[]} slots
 */

/**
 * @typedef {object} ContentDoc
 * @property {string} [title]
 * @property {string} [subtitle]
 * @property {string[]} bullets
 * @property {string[]} nodes
 * @property {string} freeform
 * @property {'vertical'|'horizontal'|null} [flow]
 * @property {'tree'|null} [kind]
 * @property {import('./tree.js').TreeNode[]} [tree]
 */

export {
  looksLikeTreeText,
  parseTree,
  flattenTree,
  countTreeNodes,
} from "./tree.js";
import { looksLikeTreeText, parseTree, flattenTree } from "./tree.js";

/**
 * @typedef {object} FilledSlot
 * @property {Slot} slot
 * @property {string} text
 */

export const TEMPLATES = /** @type {Template[]} */ ([
  {
    id: "notebook",
    name: "Notebook",
    blurb: "Pager-notes style teaching slide",
    aspect: "story",
    background: "paper",
    ingest: "title-then-bullets",
    slots: [
      { id: "t", role: "title", x: 0.08, y: 0.08, w: 0.84, h: 0.12, maxChars: 64, style: "title" },
      { id: "s", role: "subtitle", x: 0.08, y: 0.2, w: 0.84, h: 0.06, maxChars: 80, style: "label" },
      { id: "b1", role: "bullet", x: 0.1, y: 0.32, w: 0.8, h: 0.1, maxChars: 90, style: "body" },
      { id: "b2", role: "bullet", x: 0.1, y: 0.44, w: 0.8, h: 0.1, maxChars: 90, style: "body" },
      { id: "b3", role: "bullet", x: 0.1, y: 0.56, w: 0.8, h: 0.1, maxChars: 90, style: "body" },
      { id: "b4", role: "bullet", x: 0.1, y: 0.68, w: 0.8, h: 0.1, maxChars: 90, style: "body" },
      { id: "cap", role: "caption", x: 0.08, y: 0.88, w: 0.84, h: 0.06, maxChars: 60, style: "label" },
    ],
  },
  {
    id: "flow",
    name: "Flow",
    blurb: "Horizontal process (A → B → C)",
    aspect: "wide",
    background: "grid",
    ingest: "title-then-bullets",
    slots: [
      { id: "t", role: "title", x: 0.05, y: 0.08, w: 0.9, h: 0.14, maxChars: 48, style: "title" },
      { id: "n1", role: "node", x: 0.05, y: 0.4, w: 0.18, h: 0.28, maxChars: 28, style: "body" },
      { id: "n2", role: "node", x: 0.29, y: 0.4, w: 0.18, h: 0.28, maxChars: 28, style: "body" },
      { id: "n3", role: "node", x: 0.53, y: 0.4, w: 0.18, h: 0.28, maxChars: 28, style: "body" },
      { id: "n4", role: "node", x: 0.77, y: 0.4, w: 0.18, h: 0.28, maxChars: 28, style: "body" },
      { id: "cap", role: "caption", x: 0.05, y: 0.82, w: 0.9, h: 0.1, maxChars: 80, style: "label" },
    ],
  },
  {
    id: "stack",
    name: "Pipeline",
    blurb: "Vertical flowchart (A ▼ B ▼ C)",
    aspect: "story",
    background: "grid",
    ingest: "title-then-bullets",
    slots: [
      { id: "t", role: "title", x: 0.08, y: 0.04, w: 0.84, h: 0.08, maxChars: 48, style: "title" },
      { id: "n1", role: "node", x: 0.1, y: 0.16, w: 0.8, h: 0.1, maxChars: 72, style: "body" },
      { id: "n2", role: "node", x: 0.1, y: 0.3, w: 0.8, h: 0.1, maxChars: 72, style: "body" },
      { id: "n3", role: "node", x: 0.1, y: 0.44, w: 0.8, h: 0.1, maxChars: 72, style: "body" },
      { id: "n4", role: "node", x: 0.1, y: 0.58, w: 0.8, h: 0.1, maxChars: 72, style: "body" },
      { id: "n5", role: "node", x: 0.1, y: 0.72, w: 0.8, h: 0.1, maxChars: 72, style: "body" },
      { id: "cap", role: "caption", x: 0.08, y: 0.9, w: 0.84, h: 0.05, maxChars: 60, style: "label" },
    ],
  },
  {
    id: "arch",
    name: "Architecture",
    blurb: "Layered tiers + dashed connectors (local)",
    aspect: "story",
    background: "grid",
    ingest: "title-then-bullets",
    slots: [
      { id: "t", role: "title", x: 0.08, y: 0.06, w: 0.84, h: 0.1, maxChars: 48, style: "title" },
      { id: "n1", role: "node", x: 0.1, y: 0.22, w: 0.8, h: 0.12, maxChars: 40, style: "body" },
      { id: "n2", role: "node", x: 0.1, y: 0.38, w: 0.8, h: 0.12, maxChars: 40, style: "body" },
      { id: "n3", role: "node", x: 0.1, y: 0.54, w: 0.8, h: 0.12, maxChars: 40, style: "body" },
      { id: "n4", role: "node", x: 0.1, y: 0.7, w: 0.8, h: 0.12, maxChars: 40, style: "body" },
      { id: "cap", role: "caption", x: 0.08, y: 0.88, w: 0.84, h: 0.06, maxChars: 60, style: "label" },
    ],
  },
  {
    id: "boxes",
    name: "Boxes",
    blurb: "Card grid — local placement",
    aspect: "square",
    background: "paper",
    ingest: "title-then-bullets",
    slots: [
      { id: "t", role: "title", x: 0.06, y: 0.06, w: 0.88, h: 0.1, maxChars: 48, style: "title" },
      { id: "n1", role: "node", x: 0.06, y: 0.22, w: 0.42, h: 0.28, maxChars: 36, style: "body" },
      { id: "n2", role: "node", x: 0.52, y: 0.22, w: 0.42, h: 0.28, maxChars: 36, style: "body" },
      { id: "n3", role: "node", x: 0.06, y: 0.56, w: 0.42, h: 0.28, maxChars: 36, style: "body" },
      { id: "n4", role: "node", x: 0.52, y: 0.56, w: 0.42, h: 0.28, maxChars: 36, style: "body" },
    ],
  },
  {
    id: "tree",
    name: "Tree",
    blurb: "Hierarchy (├── org / system map)",
    aspect: "story",
    background: "paper",
    ingest: "title-then-bullets",
    slots: [
      { id: "t", role: "title", x: 0.08, y: 0.04, w: 0.84, h: 0.08, maxChars: 64, style: "title" },
      { id: "n1", role: "node", x: 0.1, y: 0.16, w: 0.7, h: 0.08, maxChars: 72, style: "body" },
      { id: "n2", role: "node", x: 0.16, y: 0.28, w: 0.7, h: 0.08, maxChars: 72, style: "body" },
      { id: "n3", role: "node", x: 0.16, y: 0.4, w: 0.7, h: 0.08, maxChars: 72, style: "body" },
      { id: "n4", role: "node", x: 0.16, y: 0.52, w: 0.7, h: 0.08, maxChars: 72, style: "body" },
      { id: "n5", role: "node", x: 0.16, y: 0.64, w: 0.7, h: 0.08, maxChars: 72, style: "body" },
      { id: "cap", role: "caption", x: 0.08, y: 0.9, w: 0.84, h: 0.05, maxChars: 60, style: "label" },
    ],
  },
  {
    id: "compare",
    name: "Compare",
    blurb: "Two-column before / after",
    aspect: "square",
    background: "dark",
    ingest: "title-then-bullets",
    slots: [
      { id: "t", role: "title", x: 0.06, y: 0.06, w: 0.88, h: 0.12, maxChars: 50, style: "title" },
      { id: "l1", role: "bullet", x: 0.06, y: 0.28, w: 0.4, h: 0.14, maxChars: 70, style: "body" },
      { id: "l2", role: "bullet", x: 0.06, y: 0.46, w: 0.4, h: 0.14, maxChars: 70, style: "body" },
      { id: "l3", role: "bullet", x: 0.06, y: 0.64, w: 0.4, h: 0.14, maxChars: 70, style: "body" },
      { id: "r1", role: "bullet", x: 0.54, y: 0.28, w: 0.4, h: 0.14, maxChars: 70, style: "body" },
      { id: "r2", role: "bullet", x: 0.54, y: 0.46, w: 0.4, h: 0.14, maxChars: 70, style: "body" },
      { id: "r3", role: "bullet", x: 0.54, y: 0.64, w: 0.4, h: 0.14, maxChars: 70, style: "body" },
    ],
  },
]);

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}

/** Lines that are only flowchart connectors (ASCII / box-drawing). */
export function isConnectorLine(line) {
  const t = String(line || "").trim();
  if (!t) return true;
  // pure connector glyphs: │ ▼ ↓ → etc.
  if (/^[│┃┊┆|║\-\s─━├┤┬┴┼└┘┌┐▲▼◀▶↑↓←→⟷⇔]+$/u.test(t)) return true;
  if (/^(?:\|\s*)+$/.test(t)) return true;
  return false;
}

/**
 * Detect vertical ASCII flowchart:
 *   Step A
 *     │
 *     ▼
 *   Step B
 */
export function extractVerticalFlow(raw) {
  const lines = String(raw || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const connectorHits = lines.filter(isConnectorLine).length;
  const hasDown =
    connectorHits >= 1 &&
    lines.some((l) => /[▼↓⇣vV]/.test(l) || /^[│┃|]+$/.test(l));
  if (!hasDown || connectorHits < 1) return null;

  const nodes = lines.filter((l) => !isConnectorLine(l));
  if (nodes.length < 2) return null;
  return {
    title: "",
    subtitle: "",
    bullets: nodes,
    nodes,
    freeform: String(raw || ""),
    flow: "vertical",
  };
}

/** Parse raw editor text into a semantic content doc. */
export function parseContent(raw) {
  const text = String(raw || "").replace(/\r\n/g, "\n").trim();
  if (!text) {
    return {
      title: "",
      subtitle: "",
      bullets: [],
      nodes: [],
      freeform: "",
      flow: null,
      kind: null,
      tree: null,
    };
  }

  // Hierarchy before vertical flow — ├── trees are not pipelines
  if (looksLikeTreeText(text)) {
    const tree = parseTree(text);
    if (tree.length) {
      const flat = flattenTree(tree);
      const root = tree[0];
      return {
        title: root.label,
        subtitle: "",
        bullets: flat.slice(1).map((n) => n.label),
        nodes: flat.map((n) => n.label),
        freeform: text,
        flow: null,
        kind: "tree",
        tree,
      };
    }
  }

  const vertical = extractVerticalFlow(text);
  if (vertical) return { ...vertical, kind: null, tree: null };

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const bulletish = lines.filter((l) => /^[-*•]\s+/.test(l) || /^\d+[.)]\s+/.test(l));
  const cleanBullets = (bulletish.length ? bulletish : lines.slice(1)).map((l) =>
    l.replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+/, "").trim(),
  );

  const title = lines[0] || "";
  const subtitle =
    lines.length > 1 &&
    !/^[-*•]/.test(lines[1]) &&
    !/^\d+[.)]/.test(lines[1]) &&
    !isConnectorLine(lines[1])
      ? lines[1]
      : "";

  const bullets =
    bulletish.length > 0
      ? cleanBullets
      : lines
          .slice(subtitle ? 2 : 1)
          .filter((l) => !isConnectorLine(l))
          .filter(Boolean);

  return {
    title,
    subtitle,
    bullets,
    nodes: bullets.slice(0, 48),
    freeform: text,
    flow: null,
    kind: null,
    tree: null,
  };
}

function clip(text, max) {
  const t = String(text || "").trim();
  if (!max || t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/**
 * Bind a ContentDoc onto a template's slots (intelligent-ish reflow).
 * @param {Template} template
 * @param {ContentDoc} doc
 * @returns {FilledSlot[]}
 */
export function fillTemplate(template, doc) {
  const filled = [];
  const bullets = [...(doc.bullets || [])];
  const nodes = [...(doc.nodes || [])];
  let bulletIdx = 0;
  let nodeIdx = 0;

  for (const slot of template.slots) {
    let text = "";
    if (slot.role === "title") text = doc.title || "";
    else if (slot.role === "subtitle") text = doc.subtitle || "";
    else if (slot.role === "caption") {
      text = doc.subtitle || bullets[bullets.length - 1] || "";
    } else if (slot.role === "bullet" || slot.role === "body") {
      text = bullets[bulletIdx++] || "";
    } else if (slot.role === "node") {
      text = nodes[nodeIdx++] || bullets[bulletIdx++] || "";
    }
    filled.push({ slot, text: clip(text, slot.maxChars) });
  }
  return filled;
}

/** Live path: raw string → filled slots for preview. */
export function liveFill(templateId, rawText) {
  const template = getTemplate(templateId);
  const doc = parseContent(rawText);
  return { template, doc, filled: fillTemplate(template, doc) };
}

/** Aspect ratio CSS helpers */
export function aspectPadding(aspect) {
  if (aspect === "square") return "100%";
  if (aspect === "wide") return "56.25%";
  return "125%"; // story 4:5-ish
}
