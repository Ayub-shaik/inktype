/**
 * ASCII / indented hierarchy parsing.
 * Understands ├── └── │ trees and indented bullet lists.
 */

/**
 * @typedef {object} TreeNode
 * @property {string} id
 * @property {string} label
 * @property {TreeNode[]} children
 */

const BOX_CHARS = /[├└│┃┊┆\u2500-\u257F]/u;
const TREE_PREFIX =
  /^(?:[│┃┊┆|\s]*)(?:├──|└──|├─|└─|├|└|[|]--|`--|[-*+])\s*/u;

export function looksLikeTreeText(raw) {
  const text = String(raw || "");
  if (!text.trim()) return false;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let boxHits = 0;
  let indentHits = 0;
  for (const line of lines) {
    if (BOX_CHARS.test(line) && /[├└]/.test(line)) boxHits += 1;
    if (/^\s{2,}[-*•]/.test(line) || /^\t[-*•]/.test(line)) indentHits += 1;
  }
  return boxHits >= 2 || (boxHits >= 1 && lines.length >= 3) || indentHits >= 3;
}

function cleanLabel(line) {
  return String(line || "")
    .replace(TREE_PREFIX, "")
    .replace(/^[│┃┊┆|\s]+/u, "")
    .replace(/^[-*•]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .trim();
}

/** Depth from box-drawing / indent. */
function lineDepth(line) {
  const raw = String(line || "");
  if (!raw.trim()) return -1;
  // Pure connector continuation (│ alone) — skip
  if (/^[│┃┊┆|\s]+$/u.test(raw.trim()) && !/[├└]/.test(raw)) return -1;

  if (/[├└]/.test(raw)) {
    // Count leading pipe/space columns before branch glyph
    const idx = raw.search(/[├└]/u);
    const lead = raw.slice(0, Math.max(0, idx));
    const units = Math.floor(lead.replace(/\t/g, "    ").length / 4);
    return units + 1; // children are depth >= 1
  }

  const m = raw.match(/^(\s*)/);
  const spaces = (m?.[1] || "").replace(/\t/g, "    ").length;
  if (spaces >= 2) return Math.floor(spaces / 2);
  return 0;
}

/**
 * Parse hierarchy text into a forest (usually one root).
 * @param {string} raw
 * @returns {TreeNode[]}
 */
export function parseTree(raw) {
  const lines = String(raw || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => {
      const t = l.trim();
      if (!t) return false;
      // Keep branch lines; drop pure vertical connectors
      if (/^[│┃┊┆|\s]+$/u.test(t) && !/[├└]/.test(t)) return false;
      return true;
    });

  /** @type {{ depth: number, label: string }[]} */
  const items = [];
  for (const line of lines) {
    const depth = lineDepth(line);
    if (depth < 0) continue;
    const label = cleanLabel(line);
    if (!label) continue;
    items.push({ depth, label });
  }
  if (!items.length) return [];

  // If first item is depth>0, treat as rooted under synthetic? Prefer promote min depth to 0
  const minD = Math.min(...items.map((i) => i.depth));
  for (const it of items) it.depth -= minD;

  let seq = 0;
  /** @type {TreeNode[]} */
  const roots = [];
  /** @type {{ node: TreeNode, depth: number }[]} */
  const stack = [];

  for (const it of items) {
    const node = {
      id: `t${seq++}`,
      label: it.label,
      children: [],
    };
    while (stack.length && stack[stack.length - 1].depth >= it.depth) {
      stack.pop();
    }
    if (!stack.length) {
      roots.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }
    stack.push({ node, depth: it.depth });
  }
  return roots;
}

export function flattenTree(roots) {
  /** @type {{ id: string, label: string, parentId: string | null, depth: number }[]} */
  const out = [];
  function walk(node, parentId, depth) {
    out.push({
      id: node.id,
      label: node.label,
      parentId,
      depth,
    });
    for (const c of node.children || []) walk(c, node.id, depth + 1);
  }
  for (const r of roots || []) walk(r, null, 0);
  return out;
}

export function countTreeNodes(roots) {
  return flattenTree(roots).length;
}
