import cors from "cors";
import express from "express";
import {
  CHANNEL_TEMPLATES,
  CANVAS,
  FORBIDDEN_PHRASES,
  SURFACES,
  buildPackage,
  renderToBuffer,
} from "@inktype/render";
import { TEMPLATES, liveFill, parseContent } from "@inktype/core";
import { buildScene, suggestLayout } from "@inktype/diagram";
import { listPlugins, runPlugin } from "@inktype/plugins";

const PORT = Number(process.env.INKTYPE_API_PORT || 3041);
const INTERNAL_TOKEN = process.env.INKTYPE_INTERNAL_TOKEN || "";
const ALLOW_LLM = process.env.INKTYPE_ALLOW_LLM === "1";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

function requireInternal(req, res, next) {
  if (!INTERNAL_TOKEN) return next();
  const hdr = req.get("x-inktype-token") || "";
  const auth = req.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (hdr === INTERNAL_TOKEN || bearer === INTERNAL_TOKEN) return next();
  return res.status(401).json({ error: "unauthorized" });
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "inktype-api",
    port: PORT,
    allowLlm: ALLOW_LLM,
    stack: "local-first",
  });
});

app.get("/v1/plugins", (_req, res) => {
  res.json({ plugins: listPlugins(), allowLlm: ALLOW_LLM });
});

app.post("/v1/plugins/:id", async (req, res) => {
  try {
    const out = await runPlugin(req.params.id, req.body || {}, {
      allowLlm: ALLOW_LLM || Boolean(req.body?.allowLlm),
    });
    res.json(out);
  } catch (err) {
    res.status(400).json({ error: String(err?.message || err) });
  }
});

app.get("/v1/templates", (_req, res) => {
  res.json({
    product: TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      blurb: t.blurb,
      aspect: t.aspect,
    })),
    channel: CHANNEL_TEMPLATES,
    canvas: CANVAS,
    surfaces: Object.keys(SURFACES),
    plugins: listPlugins().filter((p) => !p.ai),
  });
});

app.get("/v1/themes", (_req, res) => {
  res.json({
    surfaces: SURFACES,
    forbidden_phrases: FORBIDDEN_PHRASES,
    note: "Brand tokens align with automation/config/excalidraw-preferences.yaml",
  });
});

/** Local layout only — boxes/edges. */
app.post("/v1/layout", (req, res) => {
  const doc = req.body?.doc || parseContent(req.body?.text || "");
  const layout = req.body?.layout || "auto";
  const scene = buildScene(doc, layout);
  res.json({
    suggested: suggestLayout(doc),
    layout: scene.layout,
    scene,
    source: "local",
  });
});

/** Preview structure without screenshot (cheap). */
app.post("/v1/preview", (req, res) => {
  const template = req.body?.template || "notebook";
  const text = req.body?.text || "";
  const content = req.body?.content;
  if (
    template === "flow" ||
    template === "arch" ||
    template === "boxes" ||
    template === "stack"
  ) {
    const doc = content || parseContent(text);
    return res.json({
      template,
      content: doc,
      scene: buildScene(doc, template === "flow" ? "flow" : template),
      source: "diagram",
    });
  }
  if (content) {
    return res.json({ template, content, source: "structured" });
  }
  const filled = liveFill(template, text);
  res.json({
    template: filled.template.id,
    content: filled.doc,
    slots: filled.filled,
    source: "liveFill",
  });
});

/**
 * OPTIONAL OpenClaw — content fields only. Disabled unless INKTYPE_ALLOW_LLM=1.
 */
app.post("/v1/structure", async (req, res) => {
  if (!ALLOW_LLM) {
    return res.status(403).json({
      error:
        "LLM disabled (local-first). Use POST /v1/layout or parse.content. Set INKTYPE_ALLOW_LLM=1 to enable.",
      hint: "Local alternative: POST /v1/preview with raw text",
    });
  }
  try {
    const out = await runPlugin(
      "content.structure",
      { text: req.body?.text || "" },
      { allowLlm: true },
    );
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

/**
 * Public/product render.
 */
app.post("/v1/render", async (req, res) => {
  try {
    let content = req.body?.content;
    if (!content && req.body?.text != null) {
      content = parseContent(req.body.text);
      content.fold = content.subtitle || "";
      content.nodes = content.nodes || content.bullets;
      content.simpleWords = req.body.fold || content.subtitle || "";
    }
    content = content || {};
    if (req.body?.brand) content.brand = req.body.brand;
    if (req.body?.progress) content.progress = req.body.progress;
    if (req.body?.fold) content.simpleWords = req.body.fold;
    if (req.body?.layout) content.layout = req.body.layout;

    const result = await renderToBuffer({
      template: req.body?.template || "notebook",
      content,
      aspect: req.body?.aspect,
      format: req.body?.format || "jpeg",
      quality: req.body?.quality,
      watermark: req.body?.watermark ?? true,
    });

    if (req.body?.encoding === "base64" || req.query.encoding === "base64") {
      return res.json({
        template: result.template,
        width: result.width,
        height: result.height,
        format: result.format,
        mime: result.mime,
        imageBase64: result.buffer.toString("base64"),
      });
    }

    res.setHeader("Content-Type", result.mime);
    res.setHeader("X-InkType-Template", result.template);
    res.setHeader("X-InkType-Width", String(result.width));
    res.setHeader("X-InkType-Height", String(result.height));
    return res.send(result.buffer);
  } catch (err) {
    console.error("[render]", err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.post("/v1/package", requireInternal, async (req, res) => {
  try {
    let content = req.body?.content;
    if (!content && req.body?.text != null) {
      const doc = parseContent(req.body.text);
      content = {
        title: doc.title,
        subtitle: doc.subtitle,
        bullets: doc.bullets,
        nodes: doc.nodes,
        simpleWords: req.body.fold || doc.subtitle || "",
        diagram: { nodes: doc.nodes, heading: "flow" },
      };
    }

    const packed = await buildPackage({
      surface: req.body?.surface || "linkedin",
      template: req.body?.template || "notebook",
      content: content || {},
      caption: req.body?.caption || "",
      watermark: req.body?.watermark,
      format: req.body?.format || "jpeg",
      quality: req.body?.quality,
      outPath: req.body?.outPath,
      aspect: req.body?.aspect,
    });

    res.json({
      ok: packed.ok,
      surface: packed.surface,
      series: packed.series,
      brand: packed.brand,
      template: packed.template,
      width: packed.width,
      height: packed.height,
      format: packed.format,
      mime: packed.mime,
      caption: packed.caption,
      warnings: packed.warnings,
      note: packed.note,
      outPath: packed.outPath,
      imageBase64: packed.buffer.toString("base64"),
    });
  } catch (err) {
    console.error("[package]", err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(
    `inktype-api listening on :${PORT} (local-first, llm=${ALLOW_LLM ? "on" : "off"})`,
  );
});
