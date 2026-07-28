"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  TEMPLATES,
  aspectPadding,
  liveFill,
  getTemplate,
  parseContent,
} from "@inktype/core";
import { buildScene } from "@inktype/diagram";

const API =
  process.env.NEXT_PUBLIC_INKTYPE_API_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:3041";

const DIAGRAM_IDS = new Set(["flow", "arch", "boxes", "stack"]);

const SAMPLE = `Kubernetes rollouts without drama
Keep users online while shipping

- Split traffic with a canary Service
- Watch error rate before promoting
- Auto-rollback on SLO burn
- Document the blast radius`;

const SAMPLE_ARCH = `Request path
CDN to data

- CDN | Edge
- API gateway | Auth
- Services | Workers
- Postgres | Redis`;

function guestKey() {
  if (typeof window === "undefined") return "ssr";
  const k = "inktype_guest_key";
  let v = localStorage.getItem(k);
  if (!v) {
    v = `g_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    localStorage.setItem(k, v);
  }
  return v;
}

function templateFromQuery(): string | null {
  if (typeof window === "undefined") return null;
  const t = new URLSearchParams(window.location.search).get("t");
  if (!t) return null;
  return TEMPLATES.some((x) => x.id === t) ? t : null;
}

type Role = "guest" | "free" | "pro" | "admin";

function authHeaders(role: Role, gKey: string): Record<string, string> {
  if (role === "guest") {
    return {
      Authorization: "Bearer guest",
      "X-InkType-Guest-Key": gKey,
    };
  }
  if (role === "admin") return { Authorization: "Bearer admin" };
  if (role === "pro") return { Authorization: "Bearer pro:demo" };
  return { Authorization: "Bearer free:demo" };
}

export default function HomePage() {
  const [templateId, setTemplateId] = useState("notebook");
  const [text, setText] = useState(SAMPLE);
  const [role, setRole] = useState<Role>("guest");
  const [ent, setEnt] = useState<Record<string, unknown> | null>(null);
  const [pricing, setPricing] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState(
    "Guest: 1 protected preview + 1 export. Live canvas is low-fi; JPEG preview is gated.",
  );
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const gKey = useMemo(() => guestKey(), []);

  useEffect(() => {
    const t = templateFromQuery();
    if (t) {
      setTemplateId(t);
      if (t === "arch") setText(SAMPLE_ARCH);
      setStatus(`Opened from share link · template=${t}`);
    }
  }, []);

  const isDiagram = DIAGRAM_IDS.has(templateId);

  const { template, filled, scene } = useMemo(() => {
    const t = getTemplate(templateId);
    const doc = parseContent(text);
    if (DIAGRAM_IDS.has(templateId)) {
      return {
        template: t,
        filled: [],
        scene: buildScene(
          doc,
          (templateId === "flow"
            ? "flow"
            : templateId === "arch"
              ? "arch"
              : templateId === "boxes"
                ? "boxes"
                : "stack") as "flow" | "arch" | "boxes" | "stack",
        ),
      };
    }
    const live = liveFill(templateId, text);
    return { template: live.template, filled: live.filled, scene: null };
  }, [templateId, text]);

  async function refreshEntitlements(nextRole = role) {
    try {
      const res = await fetch(`${API}/v1/entitlements`, {
        headers: authHeaders(nextRole, gKey),
      });
      const data = await res.json();
      setEnt(data);
    } catch {
      setEnt(null);
    }
  }

  useEffect(() => {
    refreshEntitlements();
    fetch(`${API}/v1/pricing`)
      .then((r) => r.json())
      .then(setPricing)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function onUpload(file: File | null) {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (
      file.type.startsWith("text/") ||
      lower.endsWith(".md") ||
      lower.endsWith(".txt")
    ) {
      file.text().then((t) => {
        setText(t);
        setStatus(`Loaded ${file.name}`);
      });
      return;
    }
    setStatus("PDF/OCR plugins stub — paste text for now.");
  }

  async function runPreview() {
    setBusy(true);
    setStatus("Requesting protected JPEG preview…");
    try {
      const res = await fetch(`${API}/v1/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(role, gKey),
        },
        body: JSON.stringify({
          template: templateId,
          text,
          brand: "InkType",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.message || data.error || `Preview blocked (${res.status})`);
        setEnt(data.entitlements || ent);
        return;
      }
      setPreviewUrl(`data:${data.mime};base64,${data.imageBase64}`);
      setEnt(data.entitlements);
      setStatus(
        data.replay
          ? "Replayed same draft preview (no extra quota)."
          : `Protected preview OK · blur=${data.protection?.blurBottom} · watermark on`,
      );
    } catch (err) {
      setStatus(`Preview failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function runExport() {
    setBusy(true);
    setStatus("Exporting (consumes 1 image credit)…");
    try {
      const res = await fetch(`${API}/v1/render?encoding=base64`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(role, gKey),
        },
        body: JSON.stringify({
          template: templateId,
          text,
          brand: "InkType",
          encoding: "base64",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.message || data.error || `Export blocked (${res.status})`);
        setEnt(data.entitlements || ent);
        return;
      }
      const a = document.createElement("a");
      a.href = `data:${data.mime};base64,${data.imageBase64}`;
      a.download = `inktype-${templateId}.jpg`;
      a.click();
      setEnt(data.entitlements);
      setStatus(
        `Exported · remaining ${data.entitlements?.exportsRemaining ?? "∞"}`,
      );
    } catch (err) {
      setStatus(`Export failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  const proPrice = (pricing?.pro || {}) as {
    listPriceInr?: number;
    payPriceInr?: number;
    display?: string;
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          Ink<span>Type</span>
        </div>
        <div className="top-actions">
          <select
            className="chip"
            aria-label="Account"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="guest">Guest</option>
            <option value="free">Signed in (free)</option>
            <option value="pro">Pro</option>
            <option value="admin">Admin</option>
          </select>
          <select
            className="chip"
            aria-label="Template"
            value={templateId}
            onChange={(e) => {
              const id = e.target.value;
              setTemplateId(id);
              if (id === "arch" && text === SAMPLE) setText(SAMPLE_ARCH);
              if (id === "notebook" && text === SAMPLE_ARCH) setText(SAMPLE);
            }}
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="quota-bar" aria-live="polite">
        <span>
          {ent
            ? ent.unlimited
              ? "Admin · unlimited"
              : `${String(ent.plan)} · exports ${String(ent.exportsUsed)}/${String(ent.exportsLimit)} · previews ${String(ent.previewsUsed)}/${String(ent.previewsLimit)}`
            : "Connecting…"}
        </span>
        <span className="quota-price">
          Pro {proPrice.listPriceInr ?? 300}/- →{" "}
          <strong>{proPrice.payPriceInr ?? 260}/-</strong> (20% off) · 300 credits
        </span>
      </div>

      <section className="preview-wrap" aria-label="Live preview">
        <div className="preview-meta">
          <span>{template.name} · live (local)</span>
          <span>{template.blurb}</span>
        </div>
        <div className="stage">
          <div
            className="canvas-frame"
            style={{ ["--pad" as string]: aspectPadding(template.aspect) }}
          >
            <div id="ink-canvas" className={`canvas ${template.background}`}>
              {isDiagram && scene ? (
                <>
                  {(scene.edges || []).map((e) => {
                    const [x1, y1, x2, y2] = e.points || [0, 0, 0, 0];
                    return (
                      <div
                        key={e.id}
                        className="edge-hint"
                        style={{
                          left: `${((x1 + x2) / 2) * 100}%`,
                          top: `${((y1 + y2) / 2) * 100}%`,
                        }}
                      >
                        {e.style === "arrow" ? "→" : "⇣"}
                      </div>
                    );
                  })}
                  {(scene.labels || []).map((l) => (
                    <div
                      key={l.id}
                      className={`slot ${l.id === "title" ? "title" : "label"}`}
                      style={{
                        left: `${l.x * 100}%`,
                        top: `${l.y * 100}%`,
                        width: `${l.w * 100}%`,
                        height: `${l.h * 100}%`,
                      }}
                    >
                      {l.text}
                    </div>
                  ))}
                  {(scene.boxes || []).map((b) => (
                    <div
                      key={b.id}
                      className="slot node"
                      style={{
                        left: `${b.x * 100}%`,
                        top: `${b.y * 100}%`,
                        width: `${b.w * 100}%`,
                        height: `${b.h * 100}%`,
                        background: b.fill,
                      }}
                    >
                      {b.text}
                    </div>
                  ))}
                </>
              ) : (
                filled.map(({ slot, text: slotText }) => (
                  <div
                    key={slot.id}
                    className={`slot ${slot.style || "body"} ${slot.role} ${slotText ? "" : "empty"}`}
                    style={{
                      left: `${slot.x * 100}%`,
                      top: `${slot.y * 100}%`,
                      width: `${slot.w * 100}%`,
                      height: `${slot.h * 100}%`,
                    }}
                  >
                    {slotText ||
                      (slot.role === "title"
                        ? "Your title…"
                        : slot.role === "node"
                          ? "…"
                          : "")}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        {previewUrl ? (
          <div className="server-preview">
            <div className="preview-meta">
              <span>Server JPEG preview</span>
              <span>watermark + bottom blur (non-Pro)</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Protected InkType preview" />
          </div>
        ) : null}
      </section>

      <section className="editor-wrap" aria-label="Editor">
        <div className="editor-label">
          Type · local fill · JPEG preview/export gated by plan
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Title… bullets… A -> B for flow · A | B for arch"
          spellCheck
        />
        <div className="editor-tools">
          <button
            type="button"
            className="chip"
            disabled={busy}
            onClick={runPreview}
          >
            Preview JPEG
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={runExport}
          >
            Export
          </button>
          <label className="chip file-btn">
            Upload
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              onChange={(e) => onUpload(e.target.files?.[0] || null)}
            />
          </label>
        </div>
        <p className="hint">{status}</p>
        <p className="hint muted">
          Guests: 1 preview (anti half-content misuse) + 1 image. Free: 10/mo.
          Pro: 300 credits at ₹260 (20% off ₹300). Admin: unrestricted.
        </p>
      </section>
    </div>
  );
}
