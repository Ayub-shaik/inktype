/**
 * Single-user session + IP ban gate (same rules as JDI / tomorrowtools /ops).
 * 2 failed logins → permanent ban for CF-Connecting-IP.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const COOKIE_NAME = "inktype_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
export const MAX_FAILURES = 2;

export function loadAuthConfig() {
  const username =
    process.env.INKTYPE_AUTH_USER ||
    process.env.JDI_AUTH_USER ||
    "";
  const password =
    process.env.INKTYPE_AUTH_PASSWORD ||
    process.env.JDI_AUTH_PASSWORD ||
    "";
  const sessionSecret =
    process.env.INKTYPE_SESSION_SECRET ||
    process.env.JDI_SESSION_SECRET ||
    "";
  return {
    username: String(username).trim(),
    password: String(password),
    sessionSecret: String(sessionSecret).trim(),
    maxFailures: Number(process.env.INKTYPE_AUTH_MAX_FAILURES || MAX_FAILURES),
    alertEmail:
      process.env.INKTYPE_AUTH_ALERT_EMAIL ||
      process.env.JDI_AUTH_ALERT_EMAIL ||
      "admin@aysentra.com",
    resendApiKey: process.env.RESEND_API_KEY || "",
    emailFrom:
      process.env.EMAIL_FROM || "InkType Security <onboarding@resend.dev>",
  };
}

export function authEnabled(cfg = loadAuthConfig()) {
  if (process.env.INKTYPE_AUTH_DISABLE === "1") return false;
  return Boolean(cfg.username && cfg.password && cfg.sessionSecret);
}

export function clientIp(headers = {}, fallback = "unknown") {
  const h = (k) =>
    headers[k] ||
    headers[k.toLowerCase()] ||
    headers[k.toUpperCase()] ||
    "";
  for (const key of ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"]) {
    const raw = h(key);
    if (raw) return String(raw).split(",")[0].trim();
  }
  return String(fallback || "unknown").trim() || "unknown";
}

export function signSession(username, secret, ttl = SESSION_TTL_SECONDS) {
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const payload = `${username}:${exp}`;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return `${payload}:${sig}`;
}

export function verifySession(token, cfg = loadAuthConfig()) {
  if (!token || !authEnabled(cfg)) return false;
  const parts = String(token).split(":");
  if (parts.length !== 3) return false;
  const [username, expS, sig] = parts;
  const exp = Number(expS);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  if (username !== cfg.username) return false;
  const payload = `${username}:${expS}`;
  const expect = crypto
    .createHmac("sha256", cfg.sessionSecret)
    .update(payload)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect));
  } catch {
    return false;
  }
}

export class AuthGate {
  /**
   * @param {{ dataPath?: string, cfg?: ReturnType<typeof loadAuthConfig> }} [opts]
   */
  constructor(opts = {}) {
    this.cfg = opts.cfg || loadAuthConfig();
    this.dataPath =
      opts.dataPath ||
      path.join(process.cwd(), "data", "auth-gate.json");
    this.state = { failures: {}, bans: {} };
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.dataPath)) {
        this.state = JSON.parse(fs.readFileSync(this.dataPath, "utf8"));
      }
    } catch {
      this.state = { failures: {}, bans: {} };
    }
  }

  _save() {
    fs.mkdirSync(path.dirname(this.dataPath), { recursive: true });
    fs.writeFileSync(this.dataPath, JSON.stringify(this.state, null, 2));
  }

  enabled() {
    return authEnabled(this.cfg);
  }

  isBanned(ip) {
    return Boolean(this.state.bans[ip]);
  }

  async tryLogin({ username, password, ip, ua = "", pathName = "/login" }) {
    if (!this.enabled()) {
      return { ok: false, code: "AUTH_DISABLED", message: "Auth not configured" };
    }
    if (this.isBanned(ip)) {
      return {
        ok: false,
        code: "BANNED",
        message: "This IP is permanently banned.",
        status: 403,
      };
    }

    const userOk = username === this.cfg.username;
    const passOk = password === this.cfg.password;
    if (userOk && passOk) {
      delete this.state.failures[ip];
      this._save();
      const token = signSession(username, this.cfg.sessionSecret);
      return { ok: true, token, username };
    }

    const row = this.state.failures[ip] || {
      attempts: 0,
      last_attempt_at: null,
      last_username: "",
    };
    row.attempts += 1;
    row.last_attempt_at = new Date().toISOString();
    row.last_username = String(username || "").slice(0, 120);
    row.last_ua = String(ua || "").slice(0, 240);
    row.last_path = String(pathName || "").slice(0, 120);
    this.state.failures[ip] = row;
    this._save();

    if (row.attempts >= this.cfg.maxFailures) {
      this.state.bans[ip] = {
        banned_at: new Date().toISOString(),
        reason: `${row.attempts} failed login attempts`,
        report: JSON.stringify(row),
      };
      this._save();
      await this._alertBan(ip, row).catch(() => {});
      return {
        ok: false,
        code: "BANNED",
        message: "Too many failed attempts. IP permanently banned.",
        status: 403,
      };
    }

    return {
      ok: false,
      code: "INVALID",
      message: "Invalid username or password.",
      status: 401,
      attemptsLeft: this.cfg.maxFailures - row.attempts,
    };
  }

  async _alertBan(ip, row) {
    if (!this.cfg.resendApiKey) return;
    const body = {
      from: this.cfg.emailFrom,
      to: [this.cfg.alertEmail],
      subject: `[InkType] IP banned: ${ip}`,
      text: `InkType login ban\nIP: ${ip}\nAttempts: ${row.attempts}\nUser tried: ${row.last_username}\nUA: ${row.last_ua}\nAt: ${row.last_attempt_at}`,
    };
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.cfg.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }
}

export function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Content-Security-Policy":
      "default-src 'self'; img-src 'self' data: blob: https://*.dodopayments.com; style-src 'self' 'unsafe-inline' https://*.dodopayments.com; script-src 'self' 'unsafe-inline' https://*.dodopayments.com https://cdn.jsdelivr.net; connect-src 'self' https://*.dodopayments.com; frame-src 'self' https://*.dodopayments.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  };
}

export function parseCookie(header, name = COOKIE_NAME) {
  if (!header) return null;
  const parts = String(header).split(";");
  for (const p of parts) {
    const [k, ...rest] = p.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}
