import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
import { BillingStore, proPricing } from "@inktype/billing";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.INKTYPE_API_PORT || 3041);
const INTERNAL_TOKEN = process.env.INKTYPE_INTERNAL_TOKEN || "";
const ALLOW_LLM = process.env.INKTYPE_ALLOW_LLM === "1";

const billing = new BillingStore({
  dataPath:
    process.env.INKTYPE_BILLING_PATH ||
    path.join(__dirname, "..", "data", "billing-ledger.json"),
});

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

function identityFrom(req) {
  return billing.resolveIdentity({
    headers: req.headers,
    guestKey: req.body?.guestKey || req.get("x-inktype-guest-key"),
  });
}

function contentText(req) {
  if (req.body?.text != null) return String(req.body.text);
  const c = req.body?.content;
  if (!c) return "";
  return [c.title, c.subtitle, ...(c.bullets || []), ...(c.nodes || [])]
    .filter(Boolean)
    .join("\n");
}

function resolveContent(req) {
  let content = req.body?.content;
  if (!content && req.body?.text != null) {
    content = parseContent(req.body.text);
    content.nodes = content.nodes || content.bullets;
    content.simpleWords = req.body.fold || content.subtitle || "";
  }
  content = content || {};
  if (req.body?.brand) content.brand = req.body.brand;
  if (req.body?.progress) content.progress = req.body.progress;
  if (req.body?.fold) content.simpleWords = req.body.fold;
  if (req.body?.layout) content.layout = req.body.layout;
  return content;
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "inktype-api",
    port: PORT,
    allowLlm: ALLOW_LLM,
    stack: "local-first",
    billing: true,
  });
});

app.get("/v1/pricing", (_req, res) => {
  res.json({
    guest: { exports: 1, previews: 1, note: "1 protected preview + 1 image (anti-misuse)" },
    free: { exportsPerMonth: 10, previewsPerMonth: 40, note: "Sign in required" },
    pro: proPricing(),
    admin: { unlimited: true },
  });
});

app.get("/v1/entitlements", (req, res) => {
  const identity = identityFrom(req);
  res.json(billing.entitlements(identity));
});

/** Mint / echo a guest key for the browser. */
app.post("/v1/session", (req, res) => {
  const identity = identityFrom(req);
  const ent = billing.entitlements(identity);
  res.json({
    ...ent,
    authHint: {
      guest: "Authorization: Bearer guest  + X-InkType-Guest-Key",
      free: "Authorization: Bearer free:<userId>",
      pro: "Authorization: Bearer pro:<userId>",
      admin: "Authorization: Bearer admin",
    },
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
  });
});

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

app.post("/v1/preview", async (req, res) => {
  try {
    const identity = identityFrom(req);
    const text = contentText(req);
    const gate = billing.authorizePreview(identity, text);
    if (!gate.ok) {
      return res.status(402).json(gate);
    }

    const content = resolveContent(req);
    const p = gate.protection || {};
    const result = await renderToBuffer({
      template: req.body?.template || "notebook",
      content,
      aspect: req.body?.aspect,
      format: "jpeg",
      quality: p.quality ?? 72,
      watermark: p.watermark !== false,
      heavyWatermark: Boolean(p.watermark || p.heavy),
      blurBottom: Boolean(p.blurBottom),
    });

    res.json({
      mode: "preview",
      familyId: gate.familyId,
      replay: Boolean(gate.replay),
      protection: p,
      entitlements: gate.entitlements,
      template: result.template,
      width: result.width,
      height: result.height,
      mime: result.mime,
      imageBase64: result.buffer.toString("base64"),
    });
  } catch (err) {
    console.error("[preview]", err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.post("/v1/structure", async (req, res) => {
  if (!ALLOW_LLM) {
    return res.status(403).json({
      error:
        "LLM disabled (local-first). Use POST /v1/layout. Set INKTYPE_ALLOW_LLM=1 to enable.",
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

/** Final export — consumes image credit. */
app.post("/v1/render", async (req, res) => {
  try {
    const identity = identityFrom(req);
    const text = contentText(req);
    const gate = billing.authorizeExport(identity, text);
    if (!gate.ok) {
      return res.status(402).json(gate);
    }

    const content = resolveContent(req);
    const p = gate.protection || {};
    const result = await renderToBuffer({
      template: req.body?.template || "notebook",
      content,
      aspect: req.body?.aspect,
      format: req.body?.format || "jpeg",
      quality: p.quality ?? req.body?.quality ?? 92,
      watermark: Boolean(p.watermark),
      heavyWatermark: Boolean(p.heavy),
      blurBottom: false,
    });

    if (req.body?.encoding === "base64" || req.query.encoding === "base64") {
      return res.json({
        mode: "export",
        template: result.template,
        width: result.width,
        height: result.height,
        format: result.format,
        mime: result.mime,
        imageBase64: result.buffer.toString("base64"),
        entitlements: gate.entitlements,
        protection: p,
      });
    }

    res.setHeader("Content-Type", result.mime);
    res.setHeader("X-InkType-Template", result.template);
    res.setHeader("X-InkType-Mode", "export");
    res.setHeader("X-InkType-Exports-Remaining", String(gate.entitlements.exportsRemaining));
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

/** Test-only reset when INKTYPE_TEST_MODE=1 */
app.post("/v1/_test/reset-billing", (req, res) => {
  if (process.env.INKTYPE_TEST_MODE !== "1") {
    return res.status(404).json({ error: "not found" });
  }
  billing.reset();
  res.json({ ok: true });
});

export { app, billing };

if (process.env.INKTYPE_API_NO_LISTEN !== "1") {
  app.listen(PORT, () => {
    console.log(
      `inktype-api :${PORT} local-first llm=${ALLOW_LLM ? "on" : "off"} billing=on`,
    );
  });
}
