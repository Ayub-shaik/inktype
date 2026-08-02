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
import { buildScene, suggestLayout, applyLayoutOverrides } from "@inktype/diagram";
import { listPlugins, runPlugin } from "@inktype/plugins";
import {
  BillingStore,
  proPricing,
  dodoConfig,
  verifyDodoWebhook,
  parseDodoEvent,
  createProCheckoutSession,
} from "@inktype/billing";
import {
  AuthGate,
  COOKIE_NAME,
  SESSION_TTL_SECONDS,
  authEnabled,
  clientIp,
  loadAuthConfig,
  parseCookie,
  securityHeaders,
  verifySession,
} from "@inktype/auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.INKTYPE_API_PORT || 3041);
const HOST = process.env.INKTYPE_API_HOST || "127.0.0.1";
const INTERNAL_TOKEN = process.env.INKTYPE_INTERNAL_TOKEN || "";
const ALLOW_LLM = process.env.INKTYPE_ALLOW_LLM === "1";

const billing = new BillingStore({
  dataPath:
    process.env.INKTYPE_BILLING_PATH ||
    path.join(__dirname, "..", "data", "billing-ledger.json"),
});

const authGate = new AuthGate({
  dataPath:
    process.env.INKTYPE_AUTH_PATH ||
    path.join(__dirname, "..", "data", "auth-gate.json"),
  cfg: loadAuthConfig(),
});

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(
  cors({
    origin: false, // same-origin via Next proxy only
  }),
);

// Capture raw body for Dodo webhook signature verification
app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      if (req.originalUrl?.startsWith("/v1/billing/webhook")) {
        req.rawBody = buf.toString("utf8");
      }
    },
  }),
);

app.use((req, res, next) => {
  const headers = securityHeaders();
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  next();
});

function cookieOpts() {
  return {
    httpOnly: true,
    secure: process.env.INKTYPE_COOKIE_SECURE !== "0",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS * 1000,
  };
}

function hasInternalAuth(req) {
  if (!INTERNAL_TOKEN) return false;
  const hdr = req.get("x-inktype-token") || "";
  const auth = req.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return hdr === INTERNAL_TOKEN || bearer === INTERNAL_TOKEN;
}

function adminUsernames() {
  const raw =
    process.env.INKTYPE_ADMIN_USERS ||
    process.env.INKTYPE_OWNER_IS_ADMIN ||
    "";
  if (raw === "1" || raw.toLowerCase() === "true") {
    return new Set([String(authGate.cfg.username || "").toLowerCase()].filter(Boolean));
  }
  return new Set(
    String(raw)
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Session required only for privileged routes; guests may use quota APIs. */
function requireSession(req, res, next) {
  if (!authGate.enabled()) return next();
  if (hasInternalAuth(req)) {
    req.inkAuth = { role: "internal" };
    return next();
  }
  const ip = clientIp(req.headers, req.socket?.remoteAddress);
  if (authGate.isBanned(ip)) {
    return res.status(403).json({ error: "banned", code: "BANNED" });
  }
  const token = parseCookie(req.get("cookie"), COOKIE_NAME);
  if (verifySession(token, authGate.cfg)) {
    req.inkAuth = { role: "user", username: authGate.cfg.username };
    return next();
  }
  // Guest path — studio try + export quotas without login
  req.inkAuth = { role: "guest" };
  return next();
}

function requireInternal(req, res, next) {
  if (hasInternalAuth(req)) return next();
  if (!INTERNAL_TOKEN && req.inkAuth?.role === "user") return next();
  if (INTERNAL_TOKEN) return res.status(401).json({ error: "unauthorized" });
  return next();
}

function identityFrom(req) {
  if (req.inkAuth?.role === "internal") {
    return billing.resolveIdentity({
      headers: { authorization: "Bearer admin" },
    });
  }
  if (req.inkAuth?.role === "user") {
    const username = String(req.inkAuth.username || "").trim();
    if (username && adminUsernames().has(username.toLowerCase())) {
      return billing.resolveIdentity({
        headers: { authorization: "Bearer admin" },
      });
    }
    // Free by default; BillingStore upgrades to Pro when Dodo granted that userId
    return billing.resolveIdentity({
      headers: { authorization: `Bearer free:${username || "user"}` },
    });
  }
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
  const dodo = dodoConfig();
  res.json({
    ok: true,
    service: "inktype-api",
    port: PORT,
    auth: authEnabled(authGate.cfg),
    allowLlm: ALLOW_LLM,
    stack: "local-first",
    publicUrl: process.env.INKTYPE_PUBLIC_URL || null,
    dodo: {
      configured: Boolean(dodo.apiKey && dodo.webhookKey),
      environment: dodo.environment,
      productConfigured: Boolean(dodo.productIdPro),
    },
  });
});

app.post("/auth/login", async (req, res) => {
  const ip = clientIp(req.headers, req.socket?.remoteAddress);
  const result = await authGate.tryLogin({
    username: req.body?.username || "",
    password: req.body?.password || "",
    ip,
    ua: req.get("user-agent") || "",
    pathName: "/auth/login",
  });
  if (!result.ok) {
    return res.status(result.status || 401).json({
      ok: false,
      code: result.code,
      message: result.message,
      attemptsLeft: result.attemptsLeft,
    });
  }
  res.cookie(COOKIE_NAME, result.token, cookieOpts());
  return res.json({ ok: true, username: result.username });
});

app.post("/auth/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});

app.get("/auth/me", (req, res) => {
  if (!authGate.enabled()) {
    return res.json({ ok: true, authRequired: false, username: null });
  }
  const ip = clientIp(req.headers, req.socket?.remoteAddress);
  if (authGate.isBanned(ip)) {
    return res.status(403).json({ ok: false, code: "BANNED" });
  }
  const token = parseCookie(req.get("cookie"), COOKIE_NAME);
  const ok = verifySession(token, authGate.cfg);
  if (!ok) return res.status(401).json({ ok: false, code: "AUTH" });
  return res.json({
    ok: true,
    authRequired: true,
    username: authGate.cfg.username,
  });
});

/**
 * Dodo Payments webhook — public (no session). Signature required when secret set.
 * Dashboard URL: https://inktype.tomorrowtools.dev/v1/billing/webhook
 */
app.post("/v1/billing/webhook", (req, res) => {
  const cfg = dodoConfig();
  const raw =
    req.rawBody ||
    (Buffer.isBuffer(req.body)
      ? req.body.toString("utf8")
      : JSON.stringify(req.body || {}));

  try {
    if (cfg.webhookKey) {
      verifyDodoWebhook(raw, req.headers, cfg.webhookKey);
    } else {
      console.warn(
        "[dodo-webhook] DODO_PAYMENTS_WEBHOOK_KEY missing — accepting unsigned (dev only)",
      );
    }
  } catch (err) {
    console.warn("[dodo-webhook] verify failed:", err?.message || err);
    return res
      .status(401)
      .json({ ok: false, code: err?.code || "WEBHOOK_INVALID" });
  }

  let event;
  try {
    event = parseDodoEvent(raw);
  } catch {
    return res.status(400).json({ ok: false, error: "invalid_json" });
  }

  console.log(`[dodo-webhook] type=${event.type}`);

  if (
    !event.type ||
    event.type === "ping" ||
    event.type.endsWith(".ping") ||
    String(event.data?.payload_type || "").toLowerCase() === "ping"
  ) {
    return res.json({ ok: true, received: true, type: event.type || "ping" });
  }

  if (
    event.type === "payment.succeeded" ||
    event.type === "subscription.active" ||
    event.type === "subscription.renewed"
  ) {
    const data = event.data || {};
    const meta = data.metadata || {};
    const userId =
      meta.inktype_user_id ||
      meta.user_id ||
      data.customer?.email ||
      data.customer_id ||
      "anon";
    const paymentId =
      data.payment_id ||
      data.subscription_id ||
      data.checkout_session_id ||
      null;
    const result = billing.grantProFromPayment({
      userId,
      paymentId,
      productId: data.product_id || data.product_cart?.[0]?.product_id || null,
      customerId: data.customer_id || data.customer?.customer_id || null,
      amount: data.total_amount ?? data.amount ?? null,
      currency: data.currency || null,
      rawType: event.type,
    });
    return res.json({
      ok: true,
      received: true,
      type: event.type,
      granted: result.ok,
      replay: result.replay,
    });
  }

  return res.json({ ok: true, received: true, type: event.type });
});

// Everything under /v1 requires session when auth is enabled
app.use("/v1", requireSession);

app.get("/v1/pricing", (_req, res) => {
  const dodo = dodoConfig();
  res.json({
    guest: {
      exports: 1,
      previews: 1,
      note: "1 protected preview + 1 image (anti-misuse)",
    },
    free: {
      exportsPerMonth: 10,
      previewsPerMonth: 40,
      note: "Sign in required",
    },
    pro: {
      ...proPricing(),
      checkout: "overlay",
      provider: "dodo",
      ready: Boolean(dodo.apiKey && dodo.productIdPro),
      mode: dodo.checkoutMode,
    },
    admin: { unlimited: true },
  });
});

app.get("/v1/entitlements", (req, res) => {
  res.json(billing.entitlements(identityFrom(req)));
});

app.post("/v1/billing/checkout", async (req, res) => {
  try {
    const identity = identityFrom(req);
    const userId =
      req.body?.email ||
      req.inkAuth?.username ||
      identity.userId ||
      req.body?.userId ||
      "anon";
    const publicUrl =
      process.env.INKTYPE_PUBLIC_URL || "https://inktype.tomorrowtools.dev";
    const session = await createProCheckoutSession({
      userId,
      email: req.body?.email || (String(userId).includes("@") ? userId : undefined),
      name: req.body?.name || req.inkAuth?.username || undefined,
      returnUrl: `${publicUrl}/billing/success`,
    });
    res.json({
      ok: true,
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
      mode: session.mode,
      displayType: "overlay",
    });
  } catch (err) {
    console.error("[dodo-checkout]", err?.message || err, err?.details || "");
    res.status(err?.status && err.status < 500 ? err.status : 502).json({
      ok: false,
      code: err?.code || "DODO_CHECKOUT_FAILED",
      message: err?.message || "Checkout session failed",
    });
  }
});

app.post("/v1/session", (req, res) => {
  const identity = identityFrom(req);
  const ent = billing.entitlements(identity);
  res.json({
    ...ent,
    guestKey: identity.guestKey,
    note: "Private single-user deploy uses InkType login cookie; billing role=admin for owner.",
  });
});

app.get("/v1/plugins", (_req, res) => {
  res.json({ plugins: listPlugins() });
});

app.post("/v1/plugins/:id", async (req, res) => {
  try {
    const out = await runPlugin(req.params.id, req.body || {});
    res.json(out);
  } catch (err) {
    res.status(400).json({ error: String(err?.message || err) });
  }
});

app.get("/v1/templates", (_req, res) => {
  res.json({
    product: TEMPLATES,
    channel: CHANNEL_TEMPLATES,
    surfaces: SURFACES,
    canvas: CANVAS,
  });
});

app.get("/v1/themes", (_req, res) => {
  res.json({
    paper: [
      { id: "ruled", label: "Ruled notebook" },
      { id: "clipped", label: "Clipped scraps" },
      { id: "sticky", label: "Sticky notes" },
      { id: "messy", label: "Messy ink" },
      { id: "grid", label: "Grid paper" },
      { id: "paper", label: "Plain paper" },
      { id: "dark", label: "Night board" },
    ],
    exportTargets: [
      { id: "jpeg", label: "Download JPEG", kind: "download" },
      { id: "png", label: "Download PNG", kind: "download" },
      { id: "svg", label: "Download SVG", kind: "download" },
      { id: "excalidraw", label: "Export .excalidraw", kind: "download" },
      { id: "json", label: "Scene JSON", kind: "download" },
      { id: "clipboard", label: "Copy image", kind: "clipboard" },
      { id: "markdown", label: "Copy Markdown", kind: "clipboard" },
      { id: "linkedin", label: "Share to LinkedIn", kind: "share" },
      { id: "whatsapp", label: "Share to WhatsApp", kind: "share" },
      { id: "twitter", label: "Share to X", kind: "share" },
    ],
    default: "ruled",
  });
});

app.post("/v1/layout", (req, res) => {
  try {
    const content = resolveContent(req);
    const hint = req.body?.hint || req.body?.layout || "auto";
    const layoutKind = hint === "auto" ? suggestLayout(content) : hint;
    let scene = buildScene(content, layoutKind);
    if (req.body?.overrides && typeof req.body.overrides === "object") {
      scene = applyLayoutOverrides(scene, req.body.overrides);
    }
    res.json({
      ok: true,
      source: "local",
      layout: scene.layout,
      scene,
    });
  } catch (err) {
    res.status(400).json({ error: String(err?.message || err) });
  }
});

app.post("/v1/preview", async (req, res) => {
  try {
    const identity = identityFrom(req);
    const text = contentText(req);
    const gate = billing.authorizePreview(identity, text);
    if (!gate.ok) {
      return res.status(402).json({
        error: gate.message,
        code: gate.code,
        entitlements: gate.entitlements,
      });
    }
    const content = resolveContent(req);
    const template =
      req.body?.templateId || req.body?.template || "notebook";
    const hint = req.body?.layout || (template === "notebook" ? "notebook" : template);
    let scene = null;
    if (["flow", "stack", "arch", "boxes", "tree", "diagram"].includes(String(template))) {
      const suggested = suggestLayout(content);
      let layoutKind = hint === "auto" || hint === template ? suggested : hint;
      if (template === "tree" || suggested === "tree") layoutKind = "tree";
      else if (template === "flow" || template === "stack") {
        layoutKind =
          content.flow === "vertical" || suggested === "stack"
            ? "stack"
            : template === "stack"
              ? "stack"
              : "flow";
      } else if (template === "diagram") {
        layoutKind = suggested;
      } else {
        layoutKind = template;
      }
      scene = buildScene(content, layoutKind);
      if (req.body?.overrides) {
        scene = applyLayoutOverrides(scene, req.body.overrides);
      }
    }
    const rendered = await renderToBuffer({
      template,
      content: {
        ...content,
        text: contentText(req),
        brand: req.body?.brand || "InkType",
        paperStyle: req.body?.paperStyle,
        fontFamily: req.body?.fontFamily,
        scene,
      },
      watermark: gate.protection?.watermark,
      heavyWatermark: gate.protection?.heavy,
      blurBottom: gate.protection?.blurBottom,
      quality: gate.protection?.quality,
      aspect: req.body?.aspect,
      fontFamily: req.body?.fontFamily,
    });
    const buf = Buffer.isBuffer(rendered) ? rendered : Buffer.from(rendered.buffer);
    if (req.query.encoding === "base64") {
      return res.json({
        ok: true,
        mime: "image/jpeg",
        imageBase64: buf.toString("base64"),
        protection: gate.protection,
        entitlements: gate.entitlements,
        familyId: gate.familyId,
        replay: gate.replay || false,
      });
    }
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Content-Disposition", 'inline; filename="inktype-preview.jpg"');
    res.send(buf);
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
    const out = await runPlugin("openclaw-structure", req.body || {});
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.post("/v1/render", async (req, res) => {
  try {
    const identity = identityFrom(req);
    const text = contentText(req);
    const gate = billing.authorizeExport(identity, text);
    if (!gate.ok) {
      return res.status(402).json({
        error: gate.message,
        code: gate.code,
        entitlements: gate.entitlements,
      });
    }
    const content = resolveContent(req);
    const template =
      req.body?.templateId || req.body?.template || "notebook";
    const format = String(req.body?.format || req.query.format || "jpeg").toLowerCase();
    let scene = req.body?.scene || null;
    if (
      !scene &&
      ["flow", "stack", "arch", "boxes", "tree", "diagram"].includes(String(template))
    ) {
      const suggested = suggestLayout(content);
      let layoutForScene = template;
      if (template === "diagram") layoutForScene = suggested;
      else if (template === "tree" || suggested === "tree") layoutForScene = "tree";
      else if (
        (template === "flow" || template === "stack") &&
        (content.flow === "vertical" || suggested === "stack")
      ) {
        layoutForScene = "stack";
      }
      scene = buildScene(content, layoutForScene);
      if (req.body?.overrides) {
        scene = applyLayoutOverrides(scene, req.body.overrides);
      }
    } else if (scene && req.body?.overrides) {
      scene = applyLayoutOverrides(scene, req.body.overrides);
    }

    const rendered = await renderToBuffer({
      template,
      content: {
        ...content,
        text,
        brand: req.body?.brand || "InkType",
        paperStyle: req.body?.paperStyle,
        fontFamily: req.body?.fontFamily,
        scene,
      },
      watermark: gate.protection?.watermark,
      heavyWatermark: gate.protection?.heavy,
      blurBottom: false,
      quality: gate.protection?.quality || 92,
      aspect: req.body?.aspect,
      fontFamily: req.body?.fontFamily,
      format: format === "png" ? "png" : "jpeg",
    });
    const buf = Buffer.isBuffer(rendered) ? rendered : Buffer.from(rendered.buffer);

    if (req.query.encoding === "base64") {
      return res.json({
        ok: true,
        mime: format === "png" ? "image/png" : "image/jpeg",
        imageBase64: buf.toString("base64"),
        protection: gate.protection,
        entitlements: gate.entitlements,
      });
    }
    const mime = format === "png" ? "image/png" : "image/jpeg";
    const ext = format === "png" ? "png" : "jpg";
    res.setHeader("Content-Type", mime);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="inktype-${template}.${ext}"`,
    );
    res.send(buf);
  } catch (err) {
    console.error("[render]", err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.post("/v1/package", requireInternal, async (req, res) => {
  try {
    const textBlob = [
      req.body?.content?.title,
      req.body?.content?.subtitle,
      ...(req.body?.content?.bullets || []),
      req.body?.caption,
    ]
      .filter(Boolean)
      .join("\n")
      .toLowerCase();
    for (const phrase of FORBIDDEN_PHRASES) {
      if (textBlob.includes(String(phrase).toLowerCase())) {
        return res.status(400).json({
          error: `forbidden_phrase:${phrase}`,
          code: "FORBIDDEN_PHRASE",
        });
      }
    }

    const packed = await buildPackage({
      surface: req.body?.surface || "linkedin",
      series: req.body?.series,
      brand: req.body?.brand,
      template: req.body?.template,
      content: req.body?.content,
      caption: req.body?.caption,
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

app.post("/v1/_test/reset-billing", (req, res) => {
  if (process.env.INKTYPE_TEST_MODE !== "1") {
    return res.status(404).json({ error: "not found" });
  }
  billing.reset();
  res.json({ ok: true });
});

export { app, billing, authGate };

if (process.env.INKTYPE_API_NO_LISTEN !== "1") {
  app.listen(PORT, HOST, () => {
    const dodo = dodoConfig();
    console.log(
      `inktype-api http://${HOST}:${PORT} auth=${authGate.enabled()} llm=${ALLOW_LLM ? "on" : "off"} dodo=${dodo.environment}`,
    );
  });
}
