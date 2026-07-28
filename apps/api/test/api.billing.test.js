/**
 * API hard tests (billing gates) — no Playwright (fast).
 * INKTYPE_API_NO_LISTEN=1 INKTYPE_TEST_MODE=1 node --test apps/api/test/api.billing.test.js
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

process.env.INKTYPE_API_NO_LISTEN = "1";
process.env.INKTYPE_TEST_MODE = "1";
process.env.INKTYPE_BILLING_PATH = path.join(
  os.tmpdir(),
  `inktype-api-billing-${Date.now()}.json`,
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { app, billing } = await import("../src/server.js");

function listen(app) {
  return new Promise((resolve) => {
    const server = createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        server,
        base: `http://127.0.0.1:${port}`,
      });
    });
  });
}

describe("API billing gates", () => {
  /** @type {{ server: import('node:http').Server, base: string }} */
  let ctx;

  before(async () => {
    billing.reset();
    ctx = await listen(app);
  });

  after(async () => {
    await new Promise((r) => ctx.server.close(r));
  });

  async function json(method, urlPath, { body, headers } = {}) {
    const res = await fetch(`${ctx.base}${urlPath}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  it("GET /v1/pricing shows ₹260 pro offer", async () => {
    const { status, data } = await json("GET", "/v1/pricing");
    assert.equal(status, 200);
    assert.equal(data.pro.payPriceInr, 260);
    assert.equal(data.pro.listPriceInr, 300);
    assert.equal(data.guest.exports, 1);
    assert.equal(data.free.exportsPerMonth, 10);
  });

  it("guest session entitlements start at 1/1", async () => {
    const { data } = await json("POST", "/v1/session", {
      headers: {
        authorization: "Bearer guest",
        "x-inktype-guest-key": "api-guest-a",
      },
    });
    assert.equal(data.role, "guest");
    assert.equal(data.exportsRemaining, 1);
    assert.equal(data.previewsRemaining, 1);
  });

  it("layout stays free (no quota) for guests", async () => {
    const { status, data } = await json("POST", "/v1/layout", {
      body: { text: "A -> B -> C", layout: "flow" },
      headers: { authorization: "Bearer guest", "x-inktype-guest-key": "api-guest-b" },
    });
    assert.equal(status, 200);
    assert.equal(data.source, "local");
    assert.ok(data.scene.boxes.length >= 2);
  });

  it("export without credit returns 402", async () => {
    // burn the one export
    billing.reset();
    const idHdr = {
      authorization: "Bearer guest",
      "x-inktype-guest-key": "api-guest-burn",
    };
    // simulate already used via store
    const identity = billing.resolveIdentity({ headers: idHdr });
    billing.authorizeExport(identity, "used");
    const { status, data } = await json("POST", "/v1/render?encoding=base64", {
      headers: idHdr,
      body: {
        template: "notebook",
        text: "Hello\n- a",
        encoding: "base64",
      },
    });
    assert.equal(status, 402);
    assert.equal(data.code, "EXPORT_LIMIT");
  });

  it("admin bypasses export limit", async () => {
    billing.reset();
    const { status, data } = await json("GET", "/v1/entitlements", {
      headers: { authorization: "Bearer admin" },
    });
    assert.equal(status, 200);
    assert.equal(data.role, "admin");
    assert.equal(data.unlimited, true);
    assert.equal(data.exportsLimit, null);
  });
});
