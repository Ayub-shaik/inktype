/**
 * Render a diagram Scene into HTML body (Rough.js frames + dotted splines).
 */
import { esc } from "./shell.js";
import { pathToSvgD } from "@inktype/diagram";

/**
 * Keyword doodles — decorative, not content-faithful copies.
 * Coordinates are canvas pixels.
 */
function doodleLayer(text = "", width = 1080, height = 1350) {
  const t = String(text).toLowerCase();
  const bits = [];
  if (/docker|container|k8s|kubernetes|pod/.test(t)) {
    bits.push(`<g class="doodle" transform="translate(${width - 160},90)" opacity="0.7">
      <rect x="0" y="10" width="78" height="50" rx="5" fill="none" stroke="#57534e" stroke-width="2" stroke-dasharray="4 4"/>
      <rect x="10" y="0" width="58" height="16" rx="2" fill="none" stroke="#57534e" stroke-width="1.6"/>
      <text x="14" y="42" font-size="13" fill="#78716c">docker</text>
    </g>`);
  }
  if (/laptop|computer|desktop|notebook|mac|publisher|agent/.test(t)) {
    bits.push(`<g class="doodle" transform="translate(48,${height - 120})" opacity="0.65">
      <rect x="0" y="0" width="96" height="62" rx="5" fill="none" stroke="#57534e" stroke-width="1.8" stroke-dasharray="3 4"/>
      <path d="M-10 68 H106" stroke="#57534e" stroke-width="2.2" fill="none"/>
    </g>`);
  }
  if (/sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|day|engine/.test(t)) {
    bits.push(`<g class="doodle" transform="translate(${width - 140},${height - 160})" opacity="0.6">
      <circle cx="28" cy="28" r="14" fill="none" stroke="#b45309" stroke-width="2"/>
      <g stroke="#b45309" stroke-width="1.6" stroke-dasharray="1 3">
        <line x1="28" y1="2" x2="28" y2="10"/><line x1="28" y1="46" x2="28" y2="54"/>
        <line x1="2" y1="28" x2="10" y2="28"/><line x1="46" y1="28" x2="54" y2="28"/>
      </g>
    </g>`);
  }
  bits.push(`<g class="doodle messy-ink" opacity="0.45" fill="none" stroke="#a8a29e" stroke-width="1.6">
    <path d="M36 200 C60 170, 90 260, 120 220 S180 190, 210 250" stroke-dasharray="3 4"/>
    <path d="M${width - 80} 360 C${width - 110} 390, ${width - 90} 440, ${width - 130} 470" stroke-dasharray="2 5"/>
    <path d="M50 ${Math.floor(height * 0.55)} C80 ${Math.floor(height * 0.52)}, 110 ${Math.floor(height * 0.58)}, 140 ${Math.floor(height * 0.54)}" stroke-dasharray="2 3"/>
    <path d="M${width - 60} ${Math.floor(height * 0.7)} C${width - 90} ${Math.floor(height * 0.72)}, ${width - 70} ${Math.floor(height * 0.76)}, ${width - 100} ${Math.floor(height * 0.78)}" stroke-dasharray="1 4"/>
  </g>`);
  return bits.join("\n");
}

/**
 * @param {object} scene
 * @param {object} opts
 */
export function buildSceneBody(scene, opts = {}) {
  const brand = esc(opts.brand || "InkType");
  const progress = esc(opts.progress || "01 · 01");
  const canvas = scene.canvas || { width: 1080, height: 1350 };
  const W = canvas.width;
  const H = canvas.height;

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
      const style = e.style || "dotted";
      const marker =
        e.marker === "arrow" || style === "arrow"
          ? 'marker-end="url(#arrowhead)"'
          : "";
      const dash =
        style === "dashed" || style === "dotted" || style === "spline"
          ? 'stroke-dasharray="6 8"'
          : "";
      // Pixel space — avoid non-uniform viewBox stretch fattening strokes
      if (e.path && e.path.length >= 2) {
        const scaled = e.path.map(([x, y]) => [x * W, y * H]);
        const d = pathToSvgD(scaled, 1);
        return `<path d="${d}" fill="none" stroke="#78716c" stroke-width="1.7" stroke-linecap="round" vector-effect="non-scaling-stroke" ${dash} ${marker} />`;
      }
      const pts = e.points || [];
      if (pts.length < 4) return "";
      const x1 = (pts[0] * W).toFixed(1);
      const y1 = (pts[1] * H).toFixed(1);
      const x2 = (pts[2] * W).toFixed(1);
      const y2 = (pts[3] * H).toFixed(1);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#78716c" stroke-width="1.7" stroke-linecap="round" vector-effect="non-scaling-stroke" ${dash} ${marker} />`;
    })
    .join("");

  const fold = opts.fold
    ? `<div class="footer"><svg class="frame" data-stroke="#b45309" data-dash="1" data-fill="rgba(255,251,235,0.7)"></svg>
      <div class="inner"><h2>${esc(opts.footerTitle || "fold")}</h2><p>${esc(opts.fold)}</p></div></div>`
    : "";

  const allText = [
    scene.title,
    scene.subtitle,
    ...(scene.boxes || []).map((b) => b.text),
  ].join(" ");

  return `
  <div class="pad scene-root" data-canvas-w="${W}" data-canvas-h="${H}">
    <div class="top">
      <div class="badge"><svg data-stroke="#78716c" data-fill="rgba(255,255,255,0.55)"></svg><span style="position:relative;z-index:1">${progress}</span></div>
      <div class="brand">${brand}</div>
    </div>
    <div class="scene-stage">
      <svg class="scene-edges" viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="none">
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#78716c" />
          </marker>
        </defs>
        ${lines}
      </svg>
      <svg class="scene-doodles" viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
        ${doodleLayer(allText, W, H)}
      </svg>
      ${labels}
      ${boxes}
    </div>
    ${fold}
  </div>`;
}
