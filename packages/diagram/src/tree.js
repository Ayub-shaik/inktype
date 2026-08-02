/**
 * Hierarchy / org-tree layout with expanding canvas + dotted spline edges.
 */
import { flattenTree, parseTree, countTreeNodes } from "@inktype/core";
import { splineBetween } from "./paths.js";

const FILLS = [
  "rgba(254,243,199,0.92)",
  "rgba(224,242,254,0.92)",
  "rgba(254,226,226,0.88)",
  "rgba(220,252,231,0.92)",
  "rgba(237,233,254,0.92)",
  "rgba(255,237,213,0.92)",
];

function clip(s, n = 64) {
  const t = String(s || "").trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1).trimEnd()}…`;
}

/**
 * @param {object} doc
 * @returns {object} Scene with canvas {width,height}
 */
export function layoutTree(doc = {}) {
  let roots = doc.tree;
  if (!roots?.length && doc.freeform) {
    roots = parseTree(doc.freeform);
  }
  if (!roots?.length) {
    // Fallback: treat title + bullets as flat children under title
    const kids = (doc.nodes?.length ? doc.nodes : doc.bullets) || [];
    roots = [
      {
        id: "t0",
        label: doc.title || "Root",
        children: kids.map((label, i) => ({
          id: `t${i + 1}`,
          label: String(label),
          children: [],
        })),
      },
    ];
  }

  const flat = flattenTree(roots);
  const n = Math.max(flat.length, 1);
  const width = 1080;
  const topPad = 110;
  const bottomPad = 140;
  const rowPx = 82;
  const height = Math.max(1350, topPad + n * rowPx + bottomPad);

  /** @type {Map<string, {x:number,y:number,w:number,h:number}>} */
  const byId = new Map();
  /** @type {object[]} */
  const boxes = [];
  /** @type {object[]} */
  const edges = [];
  /** @type {object[]} */
  const labels = [];

  // Title band only if multiple roots or we want brand space
  let yPx = topPad;
  const leftPad = 72;
  const rightPad = 56;
  const indentPx = 56;
  const boxH = 58;
  const gap = 20;

  flat.forEach((node, i) => {
    const depth = node.depth;
    const xPx = leftPad + depth * indentPx;
    const maxW = width - xPx - rightPad;
    const wPx = Math.min(maxW, depth === 0 ? 720 : 560);
    const y = yPx;
    byId.set(node.id, { x: xPx, y, w: wPx, h: boxH });
    boxes.push({
      id: node.id,
      text: clip(node.label, depth === 0 ? 72 : 56),
      x: xPx / width,
      y: y / height,
      w: wPx / width,
      h: boxH / height,
      kind: depth === 0 ? "title" : "node",
      fill: FILLS[i % FILLS.length],
      stroke: "#44403c",
      depth,
    });
    yPx += boxH + gap;
  });

  for (const node of flat) {
    if (!node.parentId) continue;
    const a = byId.get(node.parentId);
    const b = byId.get(node.id);
    if (!a || !b) continue;
    const x1 = (a.x + Math.min(a.w * 0.2, 40)) / width;
    const y1 = (a.y + a.h) / height;
    const x2 = b.x / width;
    const y2 = (b.y + b.h / 2) / height;
    const spline = splineBetween(x1, y1, x2, y2, node.id.length + (node.depth || 0));
    edges.push({
      id: `e-${node.parentId}-${node.id}`,
      from: node.parentId,
      to: node.id,
      ...spline,
    });
  }

  // Optional tiny caption
  if (doc.subtitle) {
    labels.push({
      id: "subtitle",
      text: clip(doc.subtitle, 80),
      x: 0.07,
      y: Math.min(0.94, (yPx + 8) / height),
      w: 0.86,
      h: 0.04,
    });
  }

  return {
    layout: "tree",
    title: roots[0]?.label || doc.title || "",
    subtitle: doc.subtitle || "",
    boxes,
    edges,
    labels,
    canvas: { width, height, expand: true },
    meta: {
      nodeCount: countTreeNodes(roots),
      kind: "tree",
      connector: "dotted-spline",
    },
  };
}

/**
 * Recompute tree parent→child splines after drag (preserve topology).
 */
export function rebindTreeEdges(scene) {
  const boxes = scene?.boxes || [];
  const byId = Object.fromEntries(boxes.map((b) => [b.id, b]));
  const edges = (scene.edges || [])
    .map((e, i) => {
      const a = byId[e.from];
      const b = byId[e.to];
      if (!a || !b) return null;
      const x1 = a.x + Math.min(a.w * 0.2, 0.04);
      const y1 = a.y + a.h;
      const x2 = b.x;
      const y2 = b.y + b.h / 2;
      const spline = splineBetween(x1, y1, x2, y2, i + 1);
      return { ...e, ...spline, style: "dotted", marker: "none" };
    })
    .filter(Boolean);
  return { ...scene, edges };
}
