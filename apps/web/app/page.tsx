"use client";

import { useMemo, useRef, useState } from "react";
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

export default function HomePage() {
  const [templateId, setTemplateId] = useState("notebook");
  const [text, setText] = useState(SAMPLE);
  const [status, setStatus] = useState(
    "Local stack: type → slots/diagram. OpenClaw off unless you enable it.",
  );
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
        setStatus(`Loaded ${file.name} (local parse)`);
      });
      return;
    }
    if (lower.endsWith(".pdf") || file.type === "application/pdf") {
      setStatus("PDF plugin stub — paste text for now (no OpenClaw).");
      return;
    }
    if (file.type.startsWith("image/")) {
      setStatus("OCR plugin stub — paste text for now (no OpenClaw).");
      return;
    }
    setStatus("Unsupported file type for MVP.");
  }

  async function exportPng() {
    setExporting(true);
    setStatus("Rendering via local API (Virgil/Rough)…");
    try {
      const doc = parseContent(text);
      const res = await fetch(`${API}/v1/render?encoding=base64`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: templateId,
          content: {
            brand: "InkType",
            title: doc.title,
            subtitle: doc.subtitle,
            bullets: doc.bullets,
            nodes: doc.nodes,
            diagram: { heading: "flow", nodes: doc.nodes },
            simpleWords: doc.subtitle || "Typed live in InkType",
            progress: "01 · 01",
          },
          aspect: template.aspect,
          format: "jpeg",
          watermark: true,
          encoding: "base64",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const a = document.createElement("a");
      a.href = `data:${data.mime};base64,${data.imageBase64}`;
      a.download = `inktype-${templateId}.jpg`;
      a.click();
      setStatus(`Exported ${data.width}×${data.height} JPEG (local render).`);
    } catch (err) {
      setStatus(
        `Export failed — is the API on :3041? (${String((err as Error).message || err).slice(0, 80)})`,
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          Ink<span>Type</span>
        </div>
        <div className="top-actions">
          <select
            className="chip"
            aria-label="Template"
            value={templateId}
            onChange={(e) => {
              const id = e.target.value;
              setTemplateId(id);
              if (id === "arch" && text === SAMPLE) setText(SAMPLE_ARCH);
              if (id === "notebook" && text === SAMPLE_ARCH) setText(SAMPLE);
              setStatus(
                `Switched to ${getTemplate(id).name} — ${DIAGRAM_IDS.has(id) ? "local diagram engine" : "slot reflow"}.`,
              );
            }}
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn primary"
            onClick={exportPng}
            disabled={exporting}
          >
            {exporting ? "…" : "Export"}
          </button>
        </div>
      </header>

      <section className="preview-wrap" aria-label="Live preview">
        <div className="preview-meta">
          <span>{template.name}</span>
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
      </section>

      <section className="editor-wrap" aria-label="Editor">
        <div className="editor-label">
          Type · local fill {isDiagram ? "· diagram engine" : "· slots"}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            isDiagram
              ? "Title\nSubtitle\n- step or tier\n- use A -> B -> C for flow\n- use A | B for arch siblings"
              : "Title on first line\nOptional subtitle\n- bullet\n- bullet"
          }
          spellCheck
        />
        <div className="editor-tools">
          <label className="chip file-btn">
            Upload
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,text/plain,text/markdown,application/pdf,image/*"
              onChange={(e) => onUpload(e.target.files?.[0] || null)}
            />
          </label>
          <button type="button" className="chip" onClick={() => setText("")}>
            Clear
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => setText(isDiagram && templateId === "arch" ? SAMPLE_ARCH : SAMPLE)}
          >
            Sample
          </button>
        </div>
        <p className="hint">{status}</p>
      </section>
    </div>
  );
}
