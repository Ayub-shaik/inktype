import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CANVAS } from "./sizes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ASSETS_ROOT = path.join(__dirname, "..", "assets");

export function assetUrls() {
  return {
    virgilUrl: pathToFileURL(path.join(ASSETS_ROOT, "fonts", "Virgil.woff2")).href,
    roughUrl: pathToFileURL(path.join(ASSETS_ROOT, "vendor", "rough.min.js")).href,
  };
}

export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatProgress(progress) {
  const raw = String(progress || "1/5");
  const m = raw.match(/(\d+)\s*[\/·of]+\s*(\d+)/i);
  if (m) {
    return `${String(m[1]).padStart(2, "0")} · ${String(m[2]).padStart(2, "0")}`;
  }
  return raw;
}

export function colorize(text, highlights = []) {
  let line = esc(text);
  for (const h of highlights) {
    if (!h) continue;
    const eh = esc(h);
    if (line.includes(eh)) line = line.replace(eh, `<span class="hl">${eh}</span>`);
  }
  return line;
}

/**
 * @param {string} bodyInner
 * @param {{ aspect?: keyof typeof CANVAS, watermark?: boolean, brand?: string }} opts
 */
export function shell(bodyInner, opts = {}) {
  const aspect = CANVAS[opts.aspect || "story"] || CANVAS.story;
  const { virgilUrl, roughUrl } = assetUrls();
  const watermark = opts.watermark
    ? `<div class="wm">made with InkType</div>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
@font-face{font-family:'Virgil';src:url('${virgilUrl}') format('woff2');font-display:block}
*{box-sizing:border-box;margin:0;padding:0}
body{
  width:${aspect.width}px;height:${aspect.height}px;
  font-family:'Virgil','Comic Sans MS',cursive;
  background:#f7f3ea;color:#1c1917;position:relative;overflow:hidden;
}
.bg-grid{
  position:absolute;inset:0;
  background-image:
    linear-gradient(rgba(120,113,108,0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(120,113,108,0.12) 1px, transparent 1px);
  background-size:32px 32px;
  pointer-events:none;
}
.margin-rule{
  position:absolute;left:64px;top:0;bottom:0;width:2px;
  background:rgba(185,28,28,0.45);z-index:2;
}
.pad{position:relative;z-index:1;padding:48px 52px 40px 88px;height:100%;display:flex;flex-direction:column}
.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px}
.badge{position:relative;padding:8px 18px;font-size:22px;color:#44403c;font-weight:700;letter-spacing:0.04em}
.badge svg{position:absolute;inset:0;width:100%;height:100%}
.brand{font-size:22px;color:#b45309;text-align:right;letter-spacing:0.06em}
h1{font-size:46px;line-height:1.12;color:#1c1917;margin:6px 0 12px;text-align:left}
.sub{text-align:left;font-size:26px;color:#57534e;margin-bottom:20px;max-width:920px}
.hl{color:#1d4ed8;font-weight:700}
.section{position:relative;padding:16px 18px;margin-bottom:14px}
.section svg.frame{position:absolute;inset:0;width:100%;height:100%}
.section .inner{position:relative;z-index:1}
.cols{display:grid;grid-template-columns:1.05fr 0.95fr;gap:18px;flex:1;min-height:0}
.bullets{list-style:none;display:flex;flex-direction:column;gap:12px;font-size:25px;line-height:1.28}
.bullets li{display:flex;gap:10px;align-items:flex-start}
.mark{color:#b45309;font-size:22px;line-height:1.2;margin-top:2px;flex-shrink:0}
.footer{position:relative;margin-top:auto;padding:18px 22px;min-height:118px}
.footer svg.frame{position:absolute;inset:0;width:100%;height:100%}
.footer .inner{position:relative;z-index:1}
.footer h2{font-size:22px;margin-bottom:8px;color:#b45309;letter-spacing:0.08em;text-transform:lowercase}
.footer p{font-size:24px;line-height:1.35;color:#1c1917}
.cmd-row{display:grid;grid-template-columns:1.1fr 0.9fr;gap:10px;font-size:23px;padding:7px 0;border-bottom:1px dashed rgba(120,113,108,0.45)}
.cmd-row code{color:#1d4ed8}
.qblock{margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid rgba(120,113,108,0.35)}
.q{font-size:24px;color:#1c1917;margin-bottom:4px}
.ans{font-size:22px;color:#166534;margin-left:4px}
.looks{font-size:20px;color:#9a3412;margin-top:4px;margin-left:4px}
.node{position:relative;min-height:64px;display:flex;align-items:center;justify-content:center;padding:12px;font-size:22px;text-align:center;margin:6px 0}
.node svg{position:absolute;inset:0;width:100%;height:100%}
.node span{position:relative;z-index:1}
.arrow{text-align:center;color:#78716c;font-size:22px}
.flow-row{display:flex;gap:14px;align-items:stretch;flex:1;margin-top:12px}
.flow-node{position:relative;flex:1;min-height:160px;display:flex;align-items:center;justify-content:center;padding:16px;font-size:24px;text-align:center}
.flow-node svg{position:absolute;inset:0;width:100%;height:100%}
.flow-node span{position:relative;z-index:1}
.tip{font-size:22px;color:#1c1917;line-height:1.35}
.stop{display:grid;grid-template-columns:56px 1fr;gap:12px;align-items:start;margin-bottom:14px}
.stop-num{position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700}
.stop-num svg{position:absolute;inset:0;width:100%;height:100%}
.stop-num span{position:relative;z-index:1}
.stop-body{font-size:24px;line-height:1.3}
.stop-title{font-weight:700;margin-bottom:4px}
.panel-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;flex:1;min-height:0}
.panel{position:relative;padding:14px 16px;min-height:140px}
.panel svg.frame{position:absolute;inset:0;width:100%;height:100%}
.panel .inner{position:relative;z-index:1}
.panel h3{font-size:22px;margin-bottom:8px;color:#b45309;letter-spacing:0.04em}
.chain{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:22px}
.chain .chip{position:relative;padding:8px 12px}
.chain .chip svg{position:absolute;inset:0;width:100%;height:100%}
.chain .chip span{position:relative;z-index:1}
.chain .sep{color:#78716c}
.wm{
  position:absolute;right:28px;bottom:18px;z-index:5;
  font-size:18px;color:rgba(120,113,108,0.75);letter-spacing:0.04em;
}
.scene-root{position:relative}
.scene-stage{position:relative;flex:1;min-height:0;margin-top:8px}
.scene-edges{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;overflow:visible}
.scene-label{position:absolute;z-index:2;overflow:hidden}
.scene-title{font-size:42px;line-height:1.15;font-weight:700;color:#1c1917}
.scene-sub{font-size:24px;color:#57534e}
.scene-box{
  position:absolute;z-index:3;display:flex;align-items:center;justify-content:center;
  text-align:center;padding:10px 12px;font-size:22px;line-height:1.2;
}
.scene-box svg.frame{position:absolute;inset:0;width:100%;height:100%}
.scene-box span{position:relative;z-index:1}
</style>
<script src="${roughUrl}"></script>
</head><body>
<div class="bg-grid"></div>
<div class="margin-rule"></div>
${bodyInner}
${watermark}
<script>
(async () => {
  try { await document.fonts.ready; } catch (e) {}
  await new Promise(r => setTimeout(r, 160));
  const rc = rough.svg;
  document.querySelectorAll('.section svg.frame, .footer svg.frame, .badge svg, .node svg, .stop-num svg, .panel svg.frame, .chip svg, .flow-node svg').forEach((svg) => {
    if (!svg.parentElement) return;
    const stroke = svg.getAttribute('data-stroke') || '#44403c';
    const dash = svg.getAttribute('data-dash') === '1';
    const fill = svg.getAttribute('data-fill');
    const w = svg.parentElement.offsetWidth;
    const h = svg.parentElement.offsetHeight;
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('width', w); svg.setAttribute('height', h);
    const g = rc(svg);
    const opts = {
      stroke, strokeWidth: 2, roughness: 1.45, bowing: 1.15,
      fill: fill || 'transparent', fillStyle: 'solid'
    };
    if (dash) opts.strokeLineDash = [8, 7];
    svg.appendChild(g.rectangle(3, 3, Math.max(8, w - 6), Math.max(8, h - 6), opts));
  });
  document.body.setAttribute('data-ready', '1');
})();
</script>
</body></html>`;
}
