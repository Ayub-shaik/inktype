/**
 * Render a diagram Scene into HTML body (Rough.js frames on boxes).
 * Geometry is 100% local (@inktype/diagram) — no AI.
 */
import { esc } from "./shell.js";

/**
 * @param {object} scene
 * @param {object} opts
 */
export function buildSceneBody(scene, opts = {}) {
  const brand = esc(opts.brand || "InkType");
  const progress = esc(opts.progress || "01 · 01");

  const labels = (scene.labels || [])
    .map((l) => {
      const isTitle = l.id === "title";
      return `<div class="scene-label ${isTitle ? "scene-title" : "scene-sub"}" style="left:${(l.x * 100).toFixed(2)}%;top:${(l.y * 100).toFixed(2)}%;width:${(l.w * 100).toFixed(2)}%;height:${(l.h * 100).toFixed(2)}%">${esc(l.text)}</div>`;
    })
    .join("");

  const boxes = (scene.boxes || [])
    .map(
      (b) => `<div class="scene-box" style="left:${(b.x * 100).toFixed(2)}%;top:${(b.y * 100).toFixed(2)}%;width:${(b.w * 100).toFixed(2)}%;height:${(b.h * 100).toFixed(2)}%">
      <svg class="frame" data-stroke="${esc(b.stroke || "#44403c")}" data-fill="${esc(b.fill || "rgba(255,255,255,0.5)")}" data-dash="1"></svg>
      <span>${esc(b.text)}</span>
    </div>`,
    )
    .join("");

  const lines = (scene.edges || [])
    .map((e) => {
      const pts = e.points || [];
      if (pts.length < 4) return "";
      const x1 = (pts[0] * 100).toFixed(2);
      const y1 = (pts[1] * 100).toFixed(2);
      const x2 = (pts[2] * 100).toFixed(2);
      const y2 = (pts[3] * 100).toFixed(2);
      const dash =
        e.style === "dashed" ? 'stroke-dasharray="3 2.5"' : "";
      const marker = e.style === "arrow" ? 'marker-end="url(#arrowhead)"' : "";
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#57534e" stroke-width="0.7" ${dash} ${marker} />`;
    })
    .join("");

  const fold = opts.fold
    ? `<div class="footer"><svg class="frame" data-stroke="#b45309" data-dash="1" data-fill="rgba(255,251,235,0.7)"></svg>
      <div class="inner"><h2>${esc(opts.footerTitle || "fold")}</h2><p>${esc(opts.fold)}</p></div></div>`
    : "";

  return `
  <div class="pad scene-root">
    <div class="top">
      <div class="badge"><svg data-stroke="#78716c" data-fill="rgba(255,255,255,0.55)"></svg><span style="position:relative;z-index:1">${progress}</span></div>
      <div class="brand">${brand}</div>
    </div>
    <div class="scene-stage">
      <svg class="scene-edges" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
            <path d="M0,0 L4,2 L0,4 Z" fill="#57534e" />
          </marker>
        </defs>
        ${lines}
      </svg>
      ${labels}
      ${boxes}
    </div>
    ${fold}
  </div>`;
}
