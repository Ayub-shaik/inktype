import { colorize, esc, formatProgress, shell } from "./shell.js";
import { buildSceneBody } from "./sceneHtml.js";
import { buildScene } from "@inktype/diagram";
import { parseContent } from "@inktype/core";

function headerBar(opts) {
  const progress = esc(formatProgress(opts.progress || opts.slide || "1/5"));
  const brand = esc(opts.brand || "pager notes");
  return `<div class="top">
    <div class="badge"><svg data-stroke="#78716c" data-fill="rgba(255,255,255,0.55)"></svg><span style="position:relative;z-index:1">${progress}</span></div>
    <div class="brand">${brand}</div>
  </div>`;
}

function footerBox(title, body) {
  return `<div class="footer">
    <svg class="frame" data-stroke="#b45309" data-dash="1" data-fill="rgba(255,251,235,0.7)"></svg>
    <div class="inner">
      <h2>${esc(title || "fold")}</h2>
      <p>${esc(body || "")}</p>
    </div>
  </div>`;
}

function wrap(opts, bodyInner) {
  return shell(bodyInner, {
    aspect: opts.aspect || "story",
    watermark: Boolean(opts.watermark),
    heavyWatermark: Boolean(opts.heavyWatermark),
    blurBottom: Boolean(opts.blurBottom),
  });
}

export function buildNotebookHtml(opts) {
  const title = esc(opts.title || "notes");
  const sub = opts.subtitle
    ? `<div class="sub">${colorize(opts.subtitle, opts.highlights || [])}</div>`
    : "";
  const bullets = (opts.bullets || []).slice(0, 6).map((b) => {
    const text = typeof b === "string" ? b : b.text || "";
    const hl =
      typeof b === "object" && b.highlight ? [b.highlight] : opts.highlights || [];
    return `<li><span class="mark">›</span><span>${colorize(text, hl)}</span></li>`;
  });
  const tips = (opts.tips || []).slice(0, 3);
  const nodes = (opts.diagram?.nodes || opts.nodes || []).slice(0, 4).map((n) => esc(n));
  const fills = [
    "rgba(254,243,199,0.85)",
    "rgba(224,242,254,0.85)",
    "rgba(254,226,226,0.75)",
    "rgba(220,252,231,0.8)",
  ];
  const nodesHtml = nodes
    .map((n, i) => {
      const node = `<div class="node"><svg data-stroke="#44403c" data-fill="${fills[i % fills.length]}"></svg><span>${n}</span></div>`;
      return i === 0 ? node : `<div class="arrow">↓</div>${node}`;
    })
    .join("");

  const tipsHtml = tips.length
    ? `<div class="section"><svg class="frame" data-stroke="#b45309" data-dash="1"></svg><div class="inner tip">${tips
        .map((t) => `· ${esc(t)}`)
        .join("<br/>")}</div></div>`
    : "";

  const body = `
  <div class="pad">
    ${headerBar(opts)}
    <h1>${title}</h1>
    ${sub}
    <div class="cols">
      <div class="section" style="flex:1"><svg class="frame" data-stroke="#44403c" data-dash="1" data-fill="rgba(255,255,255,0.45)"></svg>
        <div class="inner"><ul class="bullets">${bullets.join("")}</ul></div>
      </div>
      <div>
        <div class="section"><svg class="frame" data-stroke="#44403c" data-dash="1" data-fill="rgba(255,255,255,0.4)"></svg>
          <div class="inner" style="font-size:20px;color:#78716c;letter-spacing:0.06em;margin-bottom:6px;text-transform:lowercase">${esc(opts.diagram?.heading || "flow")}</div>
          <div class="inner">${nodesHtml || '<div class="tip" style="color:#a8a29e">add steps…</div>'}</div>
        </div>
        ${tipsHtml}
      </div>
    </div>
    ${footerBox(opts.footerTitle || "fold", opts.simpleWords || opts.simple_words || opts.fold || "")}
  </div>`;
  return wrap(opts, body);
}

export function buildCompareHtml(opts) {
  const left = opts.left || {};
  const right = opts.right || {};
  const fallback = opts.bullets || [];
  const leftItems = (left.items || fallback.filter((_, i) => i % 2 === 0))
    .slice(0, 6)
    .map((x) => `<li><span class="mark">›</span><span>${esc(x)}</span></li>`)
    .join("");
  const rightItems = (right.items || fallback.filter((_, i) => i % 2 === 1))
    .slice(0, 6)
    .map((x) => `<li><span class="mark">›</span><span>${esc(x)}</span></li>`)
    .join("");
  const body = `
  <div class="pad">
    ${headerBar(opts)}
    <h1>${esc(opts.title || "compare")}</h1>
    ${opts.subtitle ? `<div class="sub">${esc(opts.subtitle)}</div>` : ""}
    <div class="cols" style="flex:1">
      <div class="section"><svg class="frame" data-stroke="#1d4ed8" data-dash="1" data-fill="rgba(255,255,255,0.5)"></svg>
        <div class="inner">
          <div style="font-size:28px;margin-bottom:8px">${esc(left.title || "A")}</div>
          <div style="font-size:22px;margin-bottom:10px;color:#57534e">${esc(left.blurb || "")}</div>
          <ul class="bullets">${leftItems}</ul>
        </div>
      </div>
      <div class="section"><svg class="frame" data-stroke="#166534" data-dash="1" data-fill="rgba(255,255,255,0.5)"></svg>
        <div class="inner">
          <div style="font-size:28px;margin-bottom:8px">${esc(right.title || "B")}</div>
          <div style="font-size:22px;margin-bottom:10px;color:#57534e">${esc(right.blurb || "")}</div>
          <ul class="bullets">${rightItems}</ul>
        </div>
      </div>
    </div>
    ${footerBox(opts.footerTitle || "fold", opts.simpleWords || opts.simple_words || opts.fold || "")}
  </div>`;
  return wrap(opts, body);
}

export function buildFlowHtml(opts) {
  const fills = [
    "rgba(254,243,199,0.9)",
    "rgba(224,242,254,0.9)",
    "rgba(254,226,226,0.85)",
    "rgba(220,252,231,0.9)",
  ];
  const nodes = (opts.nodes || opts.bullets || []).slice(0, 4);
  const nodesHtml = nodes
    .map(
      (n, i) =>
        `<div class="flow-node"><svg data-stroke="#44403c" data-fill="${fills[i % fills.length]}"></svg><span>${esc(n)}</span></div>`,
    )
    .join('<div class="arrow" style="align-self:center">→</div>');
  const body = `
  <div class="pad">
    ${headerBar(opts)}
    <h1>${esc(opts.title || "flow")}</h1>
    ${opts.subtitle ? `<div class="sub">${esc(opts.subtitle)}</div>` : ""}
    <div class="flow-row">${nodesHtml}</div>
    ${footerBox(opts.footerTitle || "fold", opts.simpleWords || opts.fold || "")}
  </div>`;
  return wrap({ ...opts, aspect: opts.aspect || "wide" }, body);
}

export function buildCommandsHtml(opts) {
  const rows = (opts.commands || []).slice(0, 10).map((c) => {
    const cmd = typeof c === "string" ? c : c.cmd || c.command || "";
    const purpose = typeof c === "string" ? "" : c.purpose || c.desc || "";
    return `<div class="cmd-row"><code>${esc(cmd)}</code><span>${esc(purpose)}</span></div>`;
  });
  const body = `
  <div class="pad">
    ${headerBar(opts)}
    <h1>${esc(opts.title || "commands")}</h1>
    ${opts.subtitle ? `<div class="sub">${esc(opts.subtitle)}</div>` : ""}
    <div class="section" style="flex:1"><svg class="frame" data-stroke="#44403c" data-dash="1" data-fill="rgba(255,255,255,0.5)"></svg>
      <div class="inner">${rows.join("")}</div>
    </div>
    ${footerBox(opts.footerTitle || "fold", opts.simpleWords || opts.tip || opts.fold || "")}
  </div>`;
  return wrap(opts, body);
}

export function buildInterviewHtml(opts) {
  const qs = (opts.questions || []).slice(0, 5).map((q, i) => {
    const question = typeof q === "string" ? q : q.q || q.question || "";
    const ans = typeof q === "object" ? q.ans || q.answer || "" : "";
    const looks = typeof q === "object" ? q.looks_for || q.looksFor || "" : "";
    return `<div class="qblock">
      <div class="q">${i + 1}. ${esc(question)}</div>
      <div class="ans">${esc(ans)}</div>
      ${looks ? `<div class="looks">they're probing: ${esc(looks)}</div>` : ""}
    </div>`;
  });
  const body = `
  <div class="pad">
    ${headerBar(opts)}
    <h1>${esc(opts.title || "interview notes")}</h1>
    ${opts.subtitle ? `<div class="sub">${esc(opts.subtitle)}</div>` : ""}
    <div style="flex:1;overflow:hidden">${qs.join("")}</div>
    ${footerBox(opts.footerTitle || "fold", opts.simpleWords || opts.fold || "")}
  </div>`;
  return wrap(opts, body);
}

export function buildPathwayHtml(opts) {
  const fills = [
    "rgba(254,243,199,0.9)",
    "rgba(224,242,254,0.9)",
    "rgba(254,226,226,0.85)",
    "rgba(220,252,231,0.9)",
    "rgba(237,233,254,0.9)",
    "rgba(255,237,213,0.9)",
  ];
  const stops = (opts.stops || opts.steps || opts.bullets || []).slice(0, 6).map((s, i) => {
    const title = typeof s === "string" ? s : s.title || s.name || `stop ${i + 1}`;
    const detail =
      typeof s === "object" ? s.detail || s.items?.join(" · ") || s.blurb || "" : "";
    return `<div class="stop">
      <div class="stop-num"><svg data-stroke="#44403c" data-fill="${fills[i % fills.length]}"></svg><span>${i + 1}</span></div>
      <div class="stop-body"><div class="stop-title">${esc(title)}</div>${detail ? `<div>${esc(detail)}</div>` : ""}</div>
    </div>`;
  });
  const side = (opts.aside || opts.side || opts.tips || []).slice(0, 4);
  const sideHtml = side.length
    ? `<div class="section"><svg class="frame" data-stroke="#b45309" data-dash="1" data-fill="rgba(255,255,255,0.45)"></svg>
        <div class="inner tip">${side.map((t) => `· ${esc(t)}`).join("<br/>")}</div>
      </div>`
    : "";
  const body = `
  <div class="pad">
    ${headerBar(opts)}
    <h1>${esc(opts.title || "path")}</h1>
    ${opts.subtitle ? `<div class="sub">${esc(opts.subtitle)}</div>` : ""}
    <div class="cols" style="flex:1">
      <div>${stops.join("")}</div>
      <div>${sideHtml}</div>
    </div>
    ${footerBox(opts.footerTitle || "fold", opts.simpleWords || opts.fold || "")}
  </div>`;
  return wrap(opts, body);
}

export function buildAtlasHtml(opts) {
  const panels = (opts.panels || []).slice(0, 4).map((p) => {
    const title = typeof p === "string" ? p : p.title || "panel";
    const items = typeof p === "object" ? p.items || p.bullets || [] : [];
    const chain = typeof p === "object" ? p.chain || [] : [];
    let inner = "";
    if (chain.length) {
      inner = `<div class="chain">${chain
        .map(
          (c, i) =>
            `${i ? '<span class="sep">→</span>' : ""}<span class="chip"><svg data-stroke="#78716c" data-fill="rgba(255,255,255,0.7)"></svg><span>${esc(c)}</span></span>`,
        )
        .join("")}</div>`;
    } else {
      inner = `<ul class="bullets">${items
        .slice(0, 5)
        .map((x) => `<li><span class="mark">›</span><span>${esc(x)}</span></li>`)
        .join("")}</ul>`;
    }
    return `<div class="panel"><svg class="frame" data-stroke="#44403c" data-dash="1" data-fill="rgba(255,255,255,0.5)"></svg>
      <div class="inner"><h3>${esc(title)}</h3>${inner}</div></div>`;
  });
  const body = `
  <div class="pad">
    ${headerBar(opts)}
    <h1>${esc(opts.title || "atlas")}</h1>
    ${opts.subtitle ? `<div class="sub">${esc(opts.subtitle)}</div>` : ""}
    <div class="panel-grid">${panels.join("")}</div>
    ${footerBox(opts.footerTitle || "fold", opts.simpleWords || opts.fold || "")}
  </div>`;
  return wrap(opts, body);
}

/** Map ContentDoc / API body → template HTML. */
export function buildHtml(template, opts = {}) {
  const t = String(template || "notebook").toLowerCase();

  // Diagram templates: local scene engine (boxes / edges) — never OpenClaw geometry
  if (t === "flow" || t === "arch" || t === "boxes" || t === "stack" || t === "diagram") {
    const layout =
      t === "diagram" ? opts.layout || "auto" : t === "flow" ? "flow" : t;
    const doc =
      opts.doc ||
      (opts.title || opts.bullets || opts.nodes
        ? {
            title: opts.title,
            subtitle: opts.subtitle,
            bullets: opts.bullets || [],
            nodes: opts.nodes || [],
            freeform: opts.freeform || "",
          }
        : parseContent(opts.text || opts.freeform || ""));
    const scene = opts.scene || buildScene(doc, layout);
    const body = buildSceneBody(scene, {
      brand: opts.brand,
      progress: opts.progress || opts.slide,
      fold: opts.simpleWords || opts.fold || opts.simple_words || "",
      footerTitle: opts.footerTitle,
    });
    return shell(body, {
      aspect: opts.aspect || (layout === "flow" ? "wide" : "story"),
      watermark: Boolean(opts.watermark),
      heavyWatermark: Boolean(opts.heavyWatermark),
      blurBottom: Boolean(opts.blurBottom),
    });
  }

  if (t === "compare") return buildCompareHtml(opts);
  if (t === "commands") return buildCommandsHtml(opts);
  if (t === "interview") return buildInterviewHtml(opts);
  if (t === "pathway") return buildPathwayHtml(opts);
  if (t === "atlas") return buildAtlasHtml(opts);
  // legacy flow html kept only if scene fails — prefer scene above
  return buildNotebookHtml(opts);
}
