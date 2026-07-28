/**
 * Deterministic diagram scene graph — NO AI.
 *
 * Input: ContentDoc-like { title, subtitle, bullets, nodes }
 * Output: { boxes[], edges[], labels[], layout }
 *
 * Layouts:
 *  - flow   horizontal process (A → B → C)
 *  - stack  vertical process
 *  - arch   layered architecture (tiers)
 *  - boxes  wrapped card grid
 */

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
 * @property {'arrow'|'line'|'dashed'} style
 * @property {number[]} [points] flat [x1,y1,x2,y2,...] in 0..1
 */

/**
 * @typedef {object} Scene
 * @property {string} layout
 * @property {string} [title]
 * @property {string} [subtitle]
 * @property {Box[]} boxes
 * @property {Edge[]} edges
 * @property {{ id: string, text: string, x: number, y: number, w: number, h: number }[]} labels
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

/**
 * Heuristic: pick layout from content when template says "auto".
 * @param {object} doc
 */
export function suggestLayout(doc) {
  const lines = [
    ...(doc.bullets || []),
    ...(doc.nodes || []),
    doc.freeform || "",
  ].join("\n");
  if (splitFlowLine(lines.split("\n").find((l) => splitFlowLine(l)) || "")) {
    return "flow";
  }
  if (/(tier|layer|frontend|backend|database|ingress|cdn|queue)/i.test(lines)) {
    return "arch";
  }
  if ((doc.nodes || doc.bullets || []).length >= 5) return "boxes";
  if ((doc.nodes || doc.bullets || []).length >= 2) return "flow";
  return "boxes";
}

function nodesFromDoc(doc, max = 8) {
  const fromArrows = [];
  for (const line of [...(doc.bullets || []), ...(doc.nodes || [])]) {
    const parts = splitFlowLine(line);
    if (parts) fromArrows.push(...parts);
  }
  if (fromArrows.length) {
    // unique preserve order
    const seen = new Set();
    return fromArrows.filter((n) => {
      const k = n.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, max);
  }
  const list = (doc.nodes?.length ? doc.nodes : doc.bullets) || [];
  return list.map((x) => clip(x, 40)).filter(Boolean).slice(0, max);
}

function titleBand(doc) {
  /** @type {Box[]} */
  const boxes = [];
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
  return { boxes, labels, contentTop: doc.subtitle ? 0.2 : doc.title ? 0.16 : 0.1 };
}

/** Horizontal flow with arrow edges. */
export function layoutFlow(doc) {
  const { labels, contentTop } = titleBand(doc);
  const nodes = nodesFromDoc(doc, 5);
  const n = Math.max(nodes.length, 1);
  const gap = 0.03;
  const totalGap = gap * (n - 1);
  const w = Math.min(0.2, (0.88 - totalGap) / n);
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
    edges.push({
      id: `e${i}`,
      from: a.id,
      to: b.id,
      style: "arrow",
      points: [
        a.x + a.w,
        a.y + a.h / 2,
        b.x,
        b.y + b.h / 2,
      ],
    });
  }

  return {
    layout: "flow",
    title: doc.title || "",
    subtitle: doc.subtitle || "",
    boxes,
    edges,
    labels,
  };
}

/** Vertical stack. */
export function layoutStack(doc) {
  const { labels, contentTop } = titleBand(doc);
  const nodes = nodesFromDoc(doc, 6);
  const w = 0.7;
  const h = 0.1;
  const gap = 0.035;
  const x = 0.15;

  /** @type {Box[]} */
  const boxes = nodes.map((text, i) => ({
    id: `n${i}`,
    text,
    x,
    y: contentTop + 0.04 + i * (h + gap),
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
    edges.push({
      id: `e${i}`,
      from: a.id,
      to: b.id,
      style: "arrow",
      points: [a.x + a.w / 2, a.y + a.h, b.x + b.w / 2, b.y],
    });
  }

  return {
    layout: "stack",
    title: doc.title || "",
    subtitle: doc.subtitle || "",
    boxes,
    edges,
    labels,
  };
}

/**
 * Layered architecture: each bullet/node is a tier (top → bottom).
 * Optional "a | b | c" inside a line becomes sibling boxes in that tier.
 */
export function layoutArch(doc) {
  const { labels, contentTop } = titleBand(doc);
  const tiers = (doc.nodes?.length ? doc.nodes : doc.bullets || [])
    .slice(0, 5)
    .map((line) =>
      String(line)
        .split(/\s*[|／/]\s*/)
        .map((s) => clip(s, 28))
        .filter(Boolean),
    )
    .filter((t) => t.length);

  const tierH = 0.12;
  const gapY = 0.04;
  /** @type {Box[]} */
  const boxes = [];
  /** @type {Edge[]} */
  const edges = [];

  tiers.forEach((siblings, ti) => {
    const y = contentTop + 0.02 + ti * (tierH + gapY);
    const n = siblings.length;
    const gap = 0.025;
    const w = Math.min(0.28, (0.88 - gap * (n - 1)) / n);
    const startX = 0.06 + (0.88 - (w * n + gap * (n - 1))) / 2;
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
      // Connect mid of previous tier to mid of this tier
      const prev = boxes.filter((b) => b.id.startsWith(`t${ti - 1}_`));
      const prevMid = prev[Math.floor(prev.length / 2)];
      const curMid = boxes.find((b) => b.id === tierIds[Math.floor(tierIds.length / 2)]);
      if (prevMid && curMid) {
        edges.push({
          id: `te${ti}`,
          from: prevMid.id,
          to: curMid.id,
          style: "dashed",
          points: [
            prevMid.x + prevMid.w / 2,
            prevMid.y + prevMid.h,
            curMid.x + curMid.w / 2,
            curMid.y,
          ],
        });
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
  };
}

/** Wrapped box grid (no edges). */
export function layoutBoxes(doc) {
  const { labels, contentTop } = titleBand(doc);
  const nodes = nodesFromDoc(doc, 8);
  const cols = nodes.length <= 4 ? 2 : 3;
  const gap = 0.03;
  const w = (0.88 - gap * (cols - 1)) / cols;
  const h = 0.14;

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
  };
}

/**
 * @param {object} doc
 * @param {'flow'|'stack'|'arch'|'boxes'|'auto'} [layout]
 * @returns {Scene}
 */
export function buildScene(doc, layout = "auto") {
  const kind = layout === "auto" ? suggestLayout(doc || {}) : layout;
  if (kind === "stack") return layoutStack(doc || {});
  if (kind === "arch") return layoutArch(doc || {});
  if (kind === "boxes") return layoutBoxes(doc || {});
  return layoutFlow(doc || {});
}
