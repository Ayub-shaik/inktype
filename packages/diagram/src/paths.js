/**
 * Spline / dotted connector helpers (hand-drawn feel, no fat arrows).
 */

/**
 * Cubic control points for a soft elbow / spline between two points (0..1).
 * @returns {{ style: 'dotted', marker: 'none', points: number[], path: number[][] }}
 */
export function splineBetween(x1, y1, x2, y2, seed = 0) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  // Slight perpendicular wobble so lines feel inked, not CAD
  const wobble = 0.012 + (Math.abs(Math.sin(seed * 2.7)) * 0.01);
  const ox = (-dy / len) * wobble;
  const oy = (dx / len) * wobble;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  // Prefer vertical drop then horizontal for tree-ish links
  const verticalish = Math.abs(dy) >= Math.abs(dx) * 0.55;
  /** @type {number[][]} */
  let path;
  if (verticalish) {
    const midY = y1 + dy * 0.45;
    path = [
      [x1, y1],
      [x1 + ox, midY],
      [x2 - ox, midY],
      [x2, y2],
    ];
  } else {
    path = [
      [x1, y1],
      [mx + ox, my - oy],
      [mx - ox, my + oy],
      [x2, y2],
    ];
  }
  return {
    style: "dotted",
    marker: "none",
    points: [x1, y1, x2, y2],
    path,
  };
}

/** SVG path in 0..100 viewBox units from normalized control points. */
export function pathToSvgD(path, scale = 100) {
  if (!path || path.length < 2) return "";
  const p0 = path[0];
  if (path.length === 2) {
    return `M ${(p0[0] * scale).toFixed(2)} ${(p0[1] * scale).toFixed(2)} L ${(path[1][0] * scale).toFixed(2)} ${(path[1][1] * scale).toFixed(2)}`;
  }
  const c1 = path[1];
  const c2 = path[2] || path[1];
  const p3 = path[3] || path[path.length - 1];
  return `M ${(p0[0] * scale).toFixed(2)} ${(p0[1] * scale).toFixed(2)} C ${(c1[0] * scale).toFixed(2)} ${(c1[1] * scale).toFixed(2)}, ${(c2[0] * scale).toFixed(2)} ${(c2[1] * scale).toFixed(2)}, ${(p3[0] * scale).toFixed(2)} ${(p3[1] * scale).toFixed(2)}`;
}
