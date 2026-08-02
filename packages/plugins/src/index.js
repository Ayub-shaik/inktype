import { parseContent, liveFill } from "@inktype/core";
import { buildScene, suggestLayout } from "@inktype/diagram";

/**
 * Plugin registry — real backend capabilities.
 * OpenClaw is ONLY behind `content.structure` and only when allowed.
 */

/** @typedef {{ id: string, kind: string, ai: boolean, description: string, run: Function }} Plugin */

/** @type {Map<string, Plugin>} */
const registry = new Map();

export function registerPlugin(plugin) {
  registry.set(plugin.id, plugin);
  return plugin;
}

export function listPlugins() {
  return [...registry.values()].map(({ id, kind, ai, description }) => ({
    id,
    kind,
    ai,
    description,
  }));
}

export function getPlugin(id) {
  return registry.get(id) || null;
}

export async function runPlugin(id, input = {}, ctx = {}) {
  const p = registry.get(id);
  if (!p) throw new Error(`Unknown plugin: ${id}`);
  if (p.ai && !ctx.allowLlm) {
    throw new Error(
      `Plugin ${id} requires LLM — set INKTYPE_ALLOW_LLM=1 or pass allowLlm`,
    );
  }
  return p.run(input, ctx);
}

// ---- local plugins (no AI) ----

registerPlugin({
  id: "parse.content",
  kind: "parse",
  ai: false,
  description: "Regex/heuristic ContentDoc from raw text",
  run(input) {
    return parseContent(input.text || "");
  },
});

registerPlugin({
  id: "layout.flow",
  kind: "layout",
  ai: false,
  description: "Horizontal flow boxes + arrows",
  run(input) {
    const doc = input.doc || parseContent(input.text || "");
    return buildScene(doc, "flow");
  },
});

registerPlugin({
  id: "layout.stack",
  kind: "layout",
  ai: false,
  description: "Vertical stack + arrows",
  run(input) {
    const doc = input.doc || parseContent(input.text || "");
    return buildScene(doc, "stack");
  },
});

registerPlugin({
  id: "layout.arch",
  kind: "layout",
  ai: false,
  description: "Layered architecture tiers + dashed connectors",
  run(input) {
    const doc = input.doc || parseContent(input.text || "");
    return buildScene(doc, "arch");
  },
});

registerPlugin({
  id: "layout.boxes",
  kind: "layout",
  ai: false,
  description: "Wrapped card grid",
  run(input) {
    const doc = input.doc || parseContent(input.text || "");
    return buildScene(doc, "boxes");
  },
});

registerPlugin({
  id: "layout.auto",
  kind: "layout",
  ai: false,
  description: "Heuristic layout pick (flow/arch/boxes) — still local",
  run(input) {
    const doc = input.doc || parseContent(input.text || "");
    const layout = suggestLayout(doc);
    return { layout, scene: buildScene(doc, layout) };
  },
});

registerPlugin({
  id: "preview.live",
  kind: "preview",
  ai: false,
  description: "Live slot fill for notebook-style templates",
  run(input) {
    return liveFill(input.templateId || "notebook", input.text || "");
  },
});

registerPlugin({
  id: "extract.text",
  kind: "extract",
  ai: false,
  description: "Pass-through text/markdown bytes",
  async run(input) {
    if (typeof input.text === "string") return { text: input.text };
    if (Buffer.isBuffer(input.buffer)) {
      return { text: input.buffer.toString("utf8") };
    }
    throw new Error("extract.text needs text or buffer");
  },
});

registerPlugin({
  id: "extract.pdf",
  kind: "extract",
  ai: false,
  description: "PDF text extract (stub — wire pdf.js next)",
  async run() {
    return {
      text: "",
      stub: true,
      message: "pdf.js extract not wired yet — paste text for now",
    };
  },
});

registerPlugin({
  id: "extract.ocr",
  kind: "extract",
  ai: false,
  description: "Image OCR (stub — wire tesseract.js next)",
  async run() {
    return {
      text: "",
      stub: true,
      message: "tesseract OCR not wired yet — paste text for now",
    };
  },
});

/**
 * Optional OpenClaw — content structure ONLY.
 * Does not place boxes or edges.
 */
registerPlugin({
  id: "content.structure",
  kind: "content",
  ai: true,
  description:
    "OpenClaw: messy notes → {title,subtitle,bullets,nodes,suggestedTemplate}. No geometry.",
  async run(input, ctx) {
    const { structureWithOpenClaw } = await import("./openclawStructure.js");
    return structureWithOpenClaw(input.text || "", ctx);
  },
});

/**
 * Optional Fooocus doodle assets (env-gated). Does not draw diagrams.
 * FOOOCUS_ENABLED=1 FOOOCUS_URL=http://127.0.0.1:7865
 */
registerPlugin({
  id: "assets.fooocus-doodle",
  kind: "assets",
  ai: false,
  description:
    "Resolve/cached Fooocus doodle for paper craft (laptop/docker/sun). Optional sidecar.",
  async run(input) {
    const { resolveDoodleAsset, fooocusEnabled, pingFooocus } = await import(
      "./fooocusDoodle.js"
    );
    if (!fooocusEnabled()) {
      return { ok: false, skipped: true, reason: "FOOOCUS_ENABLED not set" };
    }
    const ping = await pingFooocus();
    const asset = await resolveDoodleAsset(input.text || input.prompt || "");
    return { ok: Boolean(asset.path) || ping.ok, ping, asset };
  },
});

export const LOCAL_PLUGIN_IDS = [
  "parse.content",
  "layout.flow",
  "layout.stack",
  "layout.arch",
  "layout.boxes",
  "layout.auto",
  "preview.live",
  "extract.text",
  "extract.pdf",
  "extract.ocr",
  "assets.fooocus-doodle",
];
