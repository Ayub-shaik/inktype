import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { planOf, monthKey, proPricing } from "./plans.js";
import {
  contentFingerprint,
  findFamilyId,
  isPreviewFamilyMember,
} from "./fingerprint.js";

/**
 * File-backed quota ledger (swap for Redis/Postgres later).
 */

export class BillingStore {
  /**
   * @param {{ dataPath?: string }} [opts]
   */
  constructor(opts = {}) {
    this.dataPath =
      opts.dataPath ||
      path.join(process.cwd(), "data", "billing-ledger.json");
    this.state = { users: {}, guests: {} };
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.dataPath)) {
        this.state = JSON.parse(fs.readFileSync(this.dataPath, "utf8"));
      }
    } catch {
      this.state = { users: {}, guests: {} };
    }
  }

  _save() {
    fs.mkdirSync(path.dirname(this.dataPath), { recursive: true });
    fs.writeFileSync(this.dataPath, JSON.stringify(this.state, null, 2));
  }

  /**
   * Resolve identity from headers / body.
   * Dev auth: Authorization: Bearer guest | free:<id> | pro:<id> | admin:<id>
   * or X-InkType-Role + X-InkType-User-Id
   */
  resolveIdentity(reqLike = {}) {
    const headers = reqLike.headers || {};
    const h = (k) =>
      headers[k] || headers[k.toLowerCase()] || headers[k.toUpperCase()];

    const roleHdr = String(h("x-inktype-role") || "").toLowerCase();
    const userIdHdr = String(h("x-inktype-user-id") || "").trim();
    const guestKey =
      String(h("x-inktype-guest-key") || reqLike.guestKey || "").trim() ||
      null;

    let role = roleHdr;
    let userId = userIdHdr;

    const auth = String(h("authorization") || "");
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (bearer === "guest" || bearer.startsWith("guest:")) {
      role = "guest";
    } else if (bearer.startsWith("free:")) {
      role = "free";
      userId = bearer.slice(5) || userId;
    } else if (bearer.startsWith("pro:")) {
      role = "pro";
      userId = bearer.slice(4) || userId;
    } else if (bearer.startsWith("admin:")) {
      role = "admin";
      userId = bearer.slice(6) || userId || "admin";
    } else if (bearer === "admin") {
      role = "admin";
      userId = userId || "admin";
    }

    if (!role) role = userId ? "free" : "guest";
    if (role === "guest") {
      const key =
        guestKey ||
        `g_${crypto.createHash("sha256").update(String(h("x-forwarded-for") || h("user-agent") || crypto.randomUUID())).digest("hex").slice(0, 16)}`;
      return { role: "guest", userId: null, guestKey: key, plan: planOf("guest") };
    }
    return {
      role,
      userId: userId || "anon",
      guestKey: null,
      plan: planOf(role),
    };
  }

  _bucket(identity) {
    const mk = monthKey();
    if (identity.role === "guest") {
      if (!this.state.guests[identity.guestKey]) {
        this.state.guests[identity.guestKey] = {
          exports: 0,
          previews: 0,
          families: {},
          createdAt: new Date().toISOString(),
        };
      }
      return { kind: "guest", key: identity.guestKey, row: this.state.guests[identity.guestKey], mk };
    }
    const uid = `${identity.role}:${identity.userId}`;
    if (!this.state.users[uid]) {
      this.state.users[uid] = { months: {} };
    }
    if (!this.state.users[uid].months[mk]) {
      this.state.users[uid].months[mk] = {
        exports: 0,
        previews: 0,
        creditsUsed: 0,
        families: {},
      };
    }
    return {
      kind: "user",
      key: uid,
      row: this.state.users[uid].months[mk],
      mk,
    };
  }

  entitlements(identity) {
    const plan = identity.plan;
    const { row, mk } = this._bucket(identity);
    const exportLimit =
      identity.role === "guest"
        ? plan.lifetimeExports
        : plan.exportsPerMonth;
    const previewLimit =
      identity.role === "guest"
        ? plan.lifetimePreviews
        : plan.previewsPerMonth;

    const unlimited = !Number.isFinite(exportLimit);

    return {
      role: identity.role,
      userId: identity.userId,
      guestKey: identity.guestKey,
      month: mk,
      plan: plan.id,
      unlimited,
      exportsUsed: row.exports,
      exportsLimit: unlimited ? null : exportLimit,
      exportsRemaining: unlimited
        ? null
        : Math.max(0, exportLimit - row.exports),
      previewsUsed: row.previews,
      previewsLimit: unlimited ? null : previewLimit,
      previewsRemaining: unlimited
        ? null
        : Math.max(0, previewLimit - row.previews),
      credits:
        identity.role === "pro"
          ? {
              included: plan.creditsPerMonth,
              used: row.creditsUsed || row.exports,
              remaining: Math.max(
                0,
                plan.creditsPerMonth - (row.creditsUsed || row.exports),
              ),
            }
          : null,
      pricing: proPricing(),
      previewPolicy: {
        cleanPreview: plan.cleanPreview,
        blurBottom: plan.blurBottom,
        heavyWatermark: plan.heavyWatermark,
        cleanExport: plan.cleanExport,
        note:
          identity.role === "guest"
            ? "Guests get 1 protected preview and 1 export to prevent misuse (half-content stitching)."
            : identity.role === "admin"
              ? "Admin: unrestricted."
              : "Previews are watermarked with bottom half blurred; families of near-duplicate drafts are capped.",
      },
    };
  }

  /**
   * Authorize a preview; may consume quota.
   * @returns {{ ok: true, familyId: string, protection: object } | { ok: false, code: string, message: string }}
   */
  authorizePreview(identity, text) {
    if (identity.role === "admin") {
      return {
        ok: true,
        familyId: "admin",
        protection: {
          watermark: false,
          blurBottom: false,
          quality: 92,
          label: "admin-clean",
        },
        entitlements: this.entitlements(identity),
      };
    }

    const plan = identity.plan;
    const { row } = this._bucket(identity);
    const previewLimit =
      identity.role === "guest" ? plan.lifetimePreviews : plan.previewsPerMonth;

    if (row.previews >= previewLimit) {
      return {
        ok: false,
        code: "PREVIEW_LIMIT",
        message:
          identity.role === "guest"
            ? "Guest preview used. Sign in for more previews (misuse protection)."
            : "Monthly preview limit reached. Upgrade to Pro or wait for next month.",
        entitlements: this.entitlements(identity),
      };
    }

    let familyId = findFamilyId(row.families, text);
    if (!familyId) {
      const familyCount = Object.keys(row.families || {}).length;
      if (familyCount >= plan.previewFamiliesMax) {
        return {
          ok: false,
          code: "PREVIEW_FAMILY_CAP",
          message:
            "Too many distinct drafts previewed. Finish an export or wait — anti-stitching limit.",
          entitlements: this.entitlements(identity),
        };
      }
      familyId = contentFingerprint(text);
      row.families[familyId] = [];
    }

    const members = row.families[familyId] || [];
    if (members.length >= plan.previewsPerFamily) {
      // Exact same content can re-fetch; incremental half-content cannot
      const exact = members.some(
        (m) => contentFingerprint(m.text) === contentFingerprint(text),
      );
      if (!exact) {
        return {
          ok: false,
          code: "PREVIEW_STITCH_BLOCK",
          message:
            "Near-duplicate / half-content preview blocked for this draft. Export or change the concept substantially.",
          entitlements: this.entitlements(identity),
        };
      }
      // re-fetch same content: no extra consume
      return {
        ok: true,
        familyId,
        replay: true,
        protection: this._protection(plan),
        entitlements: this.entitlements(identity),
      };
    }

    row.previews += 1;
    members.push({
      text: String(text || "").slice(0, 8000),
      fp: contentFingerprint(text),
      at: new Date().toISOString(),
    });
    row.families[familyId] = members;
    this._save();

    return {
      ok: true,
      familyId,
      protection: this._protection(plan),
      entitlements: this.entitlements(identity),
    };
  }

  authorizeExport(identity, text) {
    if (identity.role === "admin") {
      return {
        ok: true,
        protection: { watermark: false, blurBottom: false, quality: 92 },
        entitlements: this.entitlements(identity),
      };
    }

    const plan = identity.plan;
    const { row } = this._bucket(identity);
    const exportLimit =
      identity.role === "guest" ? plan.lifetimeExports : plan.exportsPerMonth;

    if (row.exports >= exportLimit) {
      return {
        ok: false,
        code: "EXPORT_LIMIT",
        message:
          identity.role === "guest"
            ? "Guest export used (1 image). Sign in for 10/month or buy Pro (300 credits)."
            : identity.role === "free"
              ? "Free tier: 10 images/month used. Upgrade to Pro — ₹260/mo for 300 credits."
              : "Pro monthly credits exhausted (300).",
        entitlements: this.entitlements(identity),
      };
    }

    row.exports += 1;
    if (identity.role === "pro") {
      row.creditsUsed = (row.creditsUsed || 0) + 1;
    }
    this._save();

    return {
      ok: true,
      contentFp: contentFingerprint(text || ""),
      protection: {
        watermark: !plan.cleanExport,
        blurBottom: false,
        quality: plan.cleanExport ? 92 : 88,
        heavy: plan.heavyWatermark && !plan.cleanExport,
      },
      entitlements: this.entitlements(identity),
    };
  }

  _protection(plan) {
    return {
      watermark: plan.heavyWatermark,
      blurBottom: plan.blurBottom,
      quality: plan.cleanPreview ? 90 : 72,
      label: plan.cleanPreview ? "pro-preview" : "protected-preview",
      heavy: true,
    };
  }

  /** Test helper */
  reset() {
    this.state = { users: {}, guests: {} };
    this._save();
  }
}

export { isPreviewFamilyMember, contentFingerprint, planOf, proPricing, monthKey };
