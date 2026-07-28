/**
 * Hard tests: billing quotas, anti-stitch preview, diagram layout, pricing.
 * Run: node --test packages/billing/test/*.test.js packages/diagram/test/*.test.js
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  BillingStore,
  isPreviewFamilyMember,
  contentFingerprint,
  proPricing,
  planOf,
  PLANS,
} from "../src/index.js";

describe("pricing", () => {
  it("pro shows ₹300 list with 20% off → ₹260 and 300 credits", () => {
    const p = proPricing();
    assert.equal(p.listPriceInr, 300);
    assert.equal(p.discountPct, 20);
    assert.equal(p.payPriceInr, 260);
    assert.equal(p.listCredits, 300);
    assert.equal(PLANS.pro.exportsPerMonth, 300);
    assert.equal(PLANS.pro.creditsPerMonth, 300);
  });

  it("guest/free/admin quotas match product rules", () => {
    assert.equal(planOf("guest").lifetimeExports, 1);
    assert.equal(planOf("guest").lifetimePreviews, 1);
    assert.equal(planOf("free").exportsPerMonth, 10);
    assert.equal(planOf("admin").exportsPerMonth, Infinity);
  });
});

describe("preview family / stitch detection", () => {
  it("detects half-content extensions as same family", () => {
    const a = "Canary deploys\n- split traffic";
    const b = "Canary deploys\n- split traffic\n- watch errors\n- promote";
    assert.equal(isPreviewFamilyMember(a, b), true);
    assert.equal(isPreviewFamilyMember(b, a), true);
  });

  it("does not glue unrelated drafts", () => {
    assert.equal(
      isPreviewFamilyMember(
        "Kubernetes networking\n- CNI",
        "Postgres vacuum\n- bloat",
      ),
      false,
    );
  });

  it("fingerprint is stable", () => {
    assert.equal(
      contentFingerprint("Hello\nWorld"),
      contentFingerprint("hello\nworld"),
    );
  });
});

describe("BillingStore quotas", () => {
  /** @type {BillingStore} */
  let store;
  let dataPath;

  beforeEach(() => {
    dataPath = path.join(
      os.tmpdir(),
      `inktype-billing-${Date.now()}-${Math.random().toString(16).slice(2)}.json`,
    );
    store = new BillingStore({ dataPath });
  });

  it("guest: 1 preview then blocked; 1 export then blocked", () => {
    const id = store.resolveIdentity({
      headers: { authorization: "Bearer guest", "x-inktype-guest-key": "test-guest-1" },
    });
    const t1 = "Title\n- one";
    const p1 = store.authorizePreview(id, t1);
    assert.equal(p1.ok, true);
    assert.equal(p1.protection.blurBottom, true);
    assert.equal(p1.protection.watermark, true);

    const p2 = store.authorizePreview(id, t1 + "\n- two");
    assert.equal(p2.ok, false);
    assert.equal(p2.code, "PREVIEW_LIMIT");

    const e1 = store.authorizeExport(id, t1);
    assert.equal(e1.ok, true);
    const e2 = store.authorizeExport(id, t1);
    assert.equal(e2.ok, false);
    assert.equal(e2.code, "EXPORT_LIMIT");
  });

  it("free: blocks stitch after per-family preview cap", () => {
    const id = store.resolveIdentity({
      headers: { authorization: "Bearer free:alice" },
    });
    const base = "Rollouts\nKeep users online";
    const a = store.authorizePreview(id, base);
    assert.equal(a.ok, true);
    const b = store.authorizePreview(id, base + "\n- canary");
    assert.equal(b.ok, true); // family allows 2
    const c = store.authorizePreview(id, base + "\n- canary\n- promote");
    assert.equal(c.ok, false);
    assert.equal(c.code, "PREVIEW_STITCH_BLOCK");

    // exact replay of first still ok without consuming? after stitch block, first can replay
    const replay = store.authorizePreview(id, base);
    assert.equal(replay.ok, true);
    assert.equal(replay.replay, true);
  });

  it("free: allows 10 exports then stops", () => {
    const id = store.resolveIdentity({
      headers: { authorization: "Bearer free:bob" },
    });
    for (let i = 0; i < 10; i++) {
      const r = store.authorizeExport(id, `job ${i}`);
      assert.equal(r.ok, true, `export ${i}`);
    }
    const blocked = store.authorizeExport(id, "job 11");
    assert.equal(blocked.ok, false);
    assert.equal(blocked.code, "EXPORT_LIMIT");
    assert.match(blocked.message, /10/);
  });

  it("pro: 300 credits track exports; clean preview (no blur)", () => {
    const id = store.resolveIdentity({
      headers: { authorization: "Bearer pro:carol" },
    });
    const prev = store.authorizePreview(id, "Pro draft\n- a\n- b");
    assert.equal(prev.ok, true);
    assert.equal(prev.protection.blurBottom, false);
    assert.equal(prev.protection.watermark, false);

    for (let i = 0; i < 5; i++) {
      assert.equal(store.authorizeExport(id, `p${i}`).ok, true);
    }
    const ent = store.entitlements(id);
    assert.equal(ent.credits.used, 5);
    assert.equal(ent.credits.remaining, 295);
    assert.equal(ent.pricing.payPriceInr, 260);
  });

  it("admin: unrestricted preview + export", () => {
    const id = store.resolveIdentity({
      headers: { authorization: "Bearer admin" },
    });
    for (let i = 0; i < 20; i++) {
      assert.equal(store.authorizePreview(id, `x${i}`).ok, true);
      assert.equal(store.authorizeExport(id, `x${i}`).ok, true);
    }
    const ent = store.entitlements(id);
    assert.equal(ent.exportsLimit, null);
    assert.equal(ent.unlimited, true);
  });

  it("persists ledger to disk", () => {
    const id = store.resolveIdentity({
      headers: { authorization: "Bearer free:persist" },
    });
    store.authorizeExport(id, "persist me");
    assert.ok(fs.existsSync(dataPath));
    const again = new BillingStore({ dataPath });
    const ent = again.entitlements(
      again.resolveIdentity({ headers: { authorization: "Bearer free:persist" } }),
    );
    assert.equal(ent.exportsUsed, 1);
    assert.equal(ent.exportsRemaining, 9);
  });
});
