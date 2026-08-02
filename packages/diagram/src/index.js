/**
 * Deterministic diagram scene graph — NO AI.
 *
 * Layouts: flow | stack | arch | boxes | tree
 * Connectors default to dotted splines (no fat arrowheads).
 */

import { looksLikeTreeText } from "@inktype/core";
import { splineBetween } from "./paths.js";
import { layoutTree } from "./tree.js";

/**
 * @typedef {object} Box
 * @property {string} id
 * @property {string} text
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 * @property {'node'|'tier'|'title'|'note'} kind
 * @property {string} [fill]
 * @property {string} [stroke]
 */

/**
 * @typedef {object} Edge
 * @property {string} id
 * @property {string} from
 * @property {string} to
 * @property {'arrow'|'line'|'dashed'|'dotted'|'spline'} style
 * @property {'none'|'arrow'} [marker]
 * @property {number[]} [points]
 * @property {number[][]} [path]
 */

/**
 * @typedef {object} Scene
 * @property {string} layout
 * @property {string} [title]
 * @property {string} [subtitle]
 * @property {Box[]} boxes
 * @property {Edge[]} edges
 * @property {{ id: string, text: string, x: number, y: number, w: number, h: number }[]} labels
 * @property {{ width: number, height: number, expand?: boolean }} [canvas]
 */

const FILLS = [
  "rgba(254,243,199,0.9)",
  "rgba(224,242,254,0.9)",
  "rgba(254,226,226,0.85)",
  "rgba(220,252,231,0.9)",
  "rgba(237,233,254,0.9)",
  "rgba(255,237,213,0.9)",
];

function clip(s, n = 48) {
  const t = String(s || "").trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1).trimEnd()}…`;
}

/** Split "A -> B -> C" or "A → B" into node labels. */
export function splitFlowLine(line) {
  const parts = String(line || "")
    .split(/\s*(?:->|→|⇒|➜|➔)\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length >= 2 ? parts : null;
}

function isConnectorLine(line) {
  const t = String(line || "").trim();
  if (!t) return true;
  return /^[│┃┊┆|║\-\s─━├┤┬┴┼└┘┌┐▲▼◀▶↑↓←→⟷⇔]+$/u.test(t);
}

function looksVerticalFlow(doc) {
  if (doc?.flow === "vertical") return true;
  const raw = String(doc?.freeform || "");
  if (!raw) return false;
  if (looksLikeTreeText(raw) || doc?.kind === "tree") return false;
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const connectors = lines.filter(isConnectorLine).length;
  return connectors >= 1 && lines.some((l) => /[▼↓⇣]/.test(l) || /^[│┃|]+$/.test(l));
}

/**
 * Thinking brain: pick layout from content shape (not every paste → arrows).
 * @param {object} doc
 */
export function suggestLayout(doc) {
  if (doc?.kind === "tree" || doc?.tree?.length || looksLikeTreeText(doc?.freeform || "")) {
    return "tree";
  }
  if (looksVerticalFlow(doc)) return "stack";
  const lines = [
    ...(doc.bullets || []),
    ...(doc.nodes || []),
    doc.freeform || "",
  ].join("\n");
  const arrowLine = String(doc.freeform || "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => !isConnectorLine(l) && splitFlowLine(l));
  if (arrowLine && splitFlowLine(arrowLine)?.length >= 2) return "flow";
  if (/(tier|layer|frontend|backend|database|ingress|cdn|queue)/i.test(lines)) {
    return "arch";
  }
  const count = (doc.nodes || doc.bullets || []).length;
  if (count >= 6) return "boxes";
  if (count >= 2) return "stack";
  return "boxes";
}

/**
 * Content-aware template id for Studio / API.
 * @param {object} doc
 */
export function suggestTemplate(doc) {
  const layout = suggestLayout(doc || {});
  if (layout === "tree") return "tree";
  if (layout === "stack") return "stack";
  if (layout === "flow") return "flow";
  if (layout === "arch") return "arch";
  if (layout === "boxes") return "boxes";
  return "notebook";
}

function nodesFromDoc(doc, max = 32) {
  if (looksVerticalFlow(doc)) {
    const list = (doc.nodes?.length ? doc.nodes : doc.bullets) || [];
    return list
      .map((x) => clip(x, 72))
      .filter((x) => x && !isConnectorLine(x))
      .slice(0, max);
  }

  const fromArrows = [];
  const scan = [
    ...(doc.bullets || []),
    ...(doc.nodes || []),
    doc.title || "",
    doc.subtitle || "",
    doc.freeform || "",
  ];
  for (const line of scan) {
    for (const part of String(line).split("\n")) {
      if (isConnectorLine(part)) continue;
      const parts = splitFlowLine(part);
      if (parts) fromArrows.push(...parts);
    }
  }
  if (fromArrows.length) {
    const seen = new Set();
    return fromArrows
      .filter((n) => {
        const k = n.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, max);
  }
  const list = (doc.nodes?.length ? doc.nodes : doc.bullets) || [];
  return list.map((x) => clip(x, 56)).filter(Boolean).slice(0, max);
}

function titleBand(doc) {
  /** @type {Scene['labels']} */
  const labels = [];
  if (doc.title) {
    labels.push({
      id: "title",
      text: clip(doc.title, 56),
      x: 0.06,
      y: 0.05,
      w: 0.88,
      h: 0.08,
    });
  }
  if (doc.subtitle) {
    labels.push({
      id: "subtitle",
      text: clip(doc.subtitle, 72),
      x: 0.06,
      y: 0.12,
      w: 0.88,
      h: 0.05,
    });
  }
  return { labels, contentTop: doc.subtitle ? 0.2 : doc.title ? 0.16 : 0.1 };
}

function edgeSpline(id, from, to, x1, y1, x2, y2, seed = 0) {
  const s = splineBetween(x1, y1, x2, y2, seed);
  return { id, from, to, ...s };
}

/** Measure preferred pixel canvas from normalized scene bounds. */
export function measureCanvas(scene, base = { width: 1080, height: 1350 }) {
  if (scene?.canvas?.width && scene?.canvas?.height) {
    return {
      width: scene.canvas.width,
      height: scene.canvas.height,
      expand: Boolean(scene.canvas.expand),
    };
  }
  const boxes = [...(scene?.boxes || []), ...(scene?.labels || [])];
  if (!boxes.length) return { ...base, expand: false };
  let maxY = 0;
  for (const b of boxes) {
    maxY = Math.max(maxY, (b.y || 0) + (b.h || 0));
  }
  const height = Math.max(base.height, Math.ceil(maxY * base.height + 80));
  return { width: base.width, height, expand: height > base.height };
}

/** Horizontal flow with dotted spline edges (no arrowheads). */
export function layoutFlow(doc) {
  const { labels, contentTop } = titleBand(doc);
  const nodes = nodesFromDoc(doc, 8);
  const n = Math.max(nodes.length, 1);
  const width = Math.max(1080, 220 * n + 160);
  const height = 1080;
  const gap = 0.03;
  const totalGap = gap * (n - 1);
  const w = Math.min(0.18, (0.88 - totalGap) / n);
  const h = 0.22;
  const y = contentTop + 0.12;
  const startX = 0.06 + (0.88 - (w * n + totalGap)) / 2;

  /** @type {Box[]} */
  const boxes = nodes.map((text, i) => ({
    id: `n${i}`,
    text,
    x: startX + i * (w + gap),
    y,
    w,
    h,
    kind: "node",
    fill: FILLS[i % FILLS.length],
    stroke: "#44403c",
  }));

  /** @type {Edge[]} */
  const edges = [];
  for (let i = 0; i < boxes.length - 1; i++) {
    const a = boxes[i];
    const b = boxes[i + 1];
    edges.push(
      edgeSpline(
        `e${i}`,
        a.id,
        b.id,
        a.x + a.w,
        a.y + a.h / 2,
        b.x,
        b.y + b.h / 2,
        i + 1,
      ),
    );
  }

  return {
    layout: "flow",
    title: doc.title || "",
    subtitle: doc.subtitle || "",
    boxes,
    edges,
    labels,
    canvas: { width, height, expand: width > 1080 },
  };
}

/** Vertical stack — expands height for long pipelines. */
export function layoutStack(doc) {
  const { labels, contentTop } = titleBand(doc);
  const nodes = nodesFromDoc(doc, 40);
  const n = Math.max(nodes.length, 1);
  const width = 1080;
  const rowPx = 86;
  const topPx = contentTop * 1350;
  const height = Math.max(1350, topPx + n * rowPx + 100);

  /** @type {Box[]} */
  const boxes = nodes.map((text, i) => {
    const yPx = topPx + 24 + i * rowPx;
    return {
      id: `n${i}`,
      text,
      x: 0.09,
      y: yPx / height,
      w: 0.82,
      h: 64 / height,
      kind: "node",
      fill: FILLS[i % FILLS.length],
      stroke: "#44403c",
    };
  });

  /** @type {Edge[]} */
  const edges = [];
  for (let i = 0; i < boxes.length - 1; i++) {
    const a = boxes[i];
    const b = boxes[i + 1];
    edges.push(
      edgeSpline(
        `e${i}`,
        a.id,
        b.id,
        a.x + a.w / 2,
        a.y + a.h,
        b.x + b.w / 2,
        b.y,
        i + 2,
      ),
    );
  }

  return {
    layout: "stack",
    title: doc.title || "",
    subtitle: doc.subtitle || "",
    boxes,
    edges,
    labels,
    canvas: { width, height, expand: height > 1350 },
  };
}

/**
 * Layered architecture: each bullet/node is a tier (top → bottom).
 * Optional "a | b | c" inside a line becomes sibling boxes in that tier.
 */
export function layoutArch(doc) {
  const { labels, contentTop } = titleBand(doc);
  const tiers = (doc.nodes?.length ? doc.nodes : doc.bullets || [])
    .slice(0, 12)
    .map((line) =>
      String(line)
        .split(/\s*[|／/]\s*/)
        .map((s) => clip(s, 28))
        .filter(Boolean),
    )
    .filter((t) => t.length);

  const n = Math.max(tiers.length, 1);
  const width = 1080;
  const tierPx = 110;
  const height = Math.max(1350, contentTop * 1350 + n * tierPx + 120);
  const tierH = 72 / height;
  const gapY = 28 / height;

  /** @type {Box[]} */
  const boxes = [];
  /** @type {Edge[]} */
  const edges = [];

  tiers.forEach((siblings, ti) => {
    const y = contentTop + 0.02 + ti * (tierH + gapY);
    const sn = siblings.length;
    const gap = 0.025;
    const w = Math.min(0.28, (0.88 - gap * (sn - 1)) / sn);
    const startX = 0.06 + (0.88 - (w * sn + gap * (sn - 1))) / 2;
    const tierIds = [];
    siblings.forEach((text, si) => {
      const id = `t${ti}_${si}`;
      tierIds.push(id);
      boxes.push({
        id,
        text,
        x: startX + si * (w + gap),
        y,
        w,
        h: tierH,
        kind: "tier",
        fill: FILLS[ti % FILLS.length],
        stroke: "#44403c",
      });
    });
    if (ti > 0) {
      const prev = boxes.filter((b) => b.id.startsWith(`t${ti - 1}_`));
      const prevMid = prev[Math.floor(prev.length / 2)];
      const curMid = boxes.find((b) => b.id === tierIds[Math.floor(tierIds.length / 2)]);
      if (prevMid && curMid) {
        edges.push(
          edgeSpline(
            `te${ti}`,
            prevMid.id,
            curMid.id,
            prevMid.x + prevMid.w / 2,
            prevMid.y + prevMid.h,
            curMid.x + curMid.w / 2,
            curMid.y,
            ti + 3,
          ),
        );
      }
    }
  });

  return {
    layout: "arch",
    title: doc.title || "",
    subtitle: doc.subtitle || "",
    boxes,
    edges,
    labels,
    canvas: { width, height, expand: height > 1350 },
  };
}

/** Wrapped box grid (no edges). */
export function layoutBoxes(doc) {
  const { labels, contentTop } = titleBand(doc);
  const nodes = nodesFromDoc(doc, 24);
  const cols = nodes.length <= 4 ? 2 : 3;
  const gap = 0.03;
  const w = (0.88 - gap * (cols - 1)) / cols;
  const rows = Math.ceil(Math.max(nodes.length, 1) / cols);
  const width = 1080;
  const height = Math.max(1080, contentTop * 1080 + rows * 180 + 100);
  const h = 120 / height;

  /** @type {Box[]} */
  const boxes = nodes.map((text, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      id: `b${i}`,
      text,
      x: 0.06 + col * (w + gap),
      y: contentTop + 0.04 + row * (h + gap),
      w,
      h,
      kind: "node",
      fill: FILLS[i % FILLS.length],
      stroke: "#44403c",
    };
  });

  return {
    layout: "boxes",
    title: doc.title || "",
    subtitle: doc.subtitle || "",
    boxes,
    edges: [],
    labels,
    canvas: { width, height, expand: height > 1080 },
  };
}

/**
 * @param {object} doc
 * @param {'flow'|'stack'|'arch'|'boxes'|'tree'|'auto'} [layout]
 * @returns {Scene}
 */
export function buildScene(doc, layout = "auto") {
  const kind = layout === "auto" ? suggestLayout(doc || {}) : layout;
  if (kind === "tree") return layoutTree(doc || {});
  if (kind === "stack") return layoutStack(doc || {});
  if (kind === "arch") return layoutArch(doc || {});
  if (kind === "boxes") return layoutBoxes(doc || {});
  return layoutFlow(doc || {});
}

export {
  connectorsFromBoxes,
  applyLayoutOverrides,
} from "./overrides.js";

export { layoutTree, rebindTreeEdges } from "./tree.js";
export { splineBetween, pathToSvgD } from "./paths.js";
