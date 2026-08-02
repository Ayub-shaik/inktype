/**
 * Recompute connector endpoints from live box positions.
 * Trees keep parent→child topology; others use ordered dotted splines.
 */

import { splineBetween } from "./paths.js";
import { rebindTreeEdges } from "./tree.js";

/**
 * @param {{ id: string, x: number, y: number, w: number, h: number }[]} boxes
 * @param {'vertical'|'horizontal'|'auto'} [orient]
 * @param {'arrow'|'line'|'dashed'|'dotted'} [style]
 */
export function connectorsFromBoxes(boxes, orient = "auto", style = "dotted") {
  const list = (boxes || []).filter((b) => b && b.id);
  if (list.length < 2) return [];

  let ordered = [...list];
  const mode =
    orient === "auto"
      ? (() => {
          const xs = list.map((b) => b.x + b.w / 2);
          const ys = list.map((b) => b.y + b.h / 2);
          const dx = Math.max(...xs) - Math.min(...xs);
          const dy = Math.max(...ys) - Math.min(...ys);
          return dy >= dx ? "vertical" : "horizontal";
        })()
      : orient;

  if (mode === "vertical") {
    ordered.sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2));
  } else {
    ordered.sort((a, b) => a.x + a.w / 2 - (b.x + b.w / 2));
  }

  /** @type {{ id: string, from: string, to: string, style: string, marker: string, points: number[], path: number[][] }[]} */
  const edges = [];
  for (let i = 0; i < ordered.length - 1; i++) {
    const a = ordered[i];
    const b = ordered[i + 1];
    const x1 = mode === "vertical" ? a.x + a.w / 2 : a.x + a.w;
    const y1 = mode === "vertical" ? a.y + a.h : a.y + a.h / 2;
    const x2 = mode === "vertical" ? b.x + b.w / 2 : b.x;
    const y2 = mode === "vertical" ? b.y : b.y + b.h / 2;
    const spline = splineBetween(x1, y1, x2, y2, i + 1);
    edges.push({
      id: `live-e${i}`,
      from: a.id,
      to: b.id,
      style: style === "arrow" ? "dotted" : style,
      marker: style === "arrow" ? "arrow" : "none",
      points: spline.points,
      path: spline.path,
    });
  }
  return edges;
}

/**
 * Apply x/y/w/h overrides onto scene boxes + labels, then refresh edges.
 * @param {object} scene
 * @param {Record<string, Partial<{x:number,y:number,w:number,h:number}>>} overrides
 */
export function applyLayoutOverrides(scene, overrides = {}) {
  if (!scene) return scene;
  const mapRect = (item) => {
    const o = overrides[item.id];
    if (!o) return item;
    return {
      ...item,
      x: o.x ?? item.x,
      y: o.y ?? item.y,
      w: o.w ?? item.w,
      h: o.h ?? item.h,
    };
  };
  const boxes = (scene.boxes || []).map(mapRect);
  const labels = (scene.labels || []).map(mapRect);
  const next = { ...scene, boxes, labels };

  if (scene.layout === "boxes") {
    return { ...next, edges: [] };
  }
  if (scene.layout === "tree" || scene.meta?.kind === "tree") {
    return rebindTreeEdges(next);
  }

  const nodeBoxes = boxes.filter((b) => b.kind !== "title");
  const orient =
    scene.layout === "stack" || scene.layout === "arch"
      ? "vertical"
      : scene.layout === "flow"
        ? "horizontal"
        : "auto";
  const edges = connectorsFromBoxes(nodeBoxes, orient, "dotted");
  return { ...next, edges };
}
