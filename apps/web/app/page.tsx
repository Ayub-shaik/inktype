"use client";

import { useMemo, useRef, useState } from "react";
import {
  TEMPLATES,
  aspectPadding,
  liveFill,
  getTemplate,
  parseContent,
} from "@inktype/core";

const API =
  process.env.NEXT_PUBLIC_INKTYPE_API_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:3041";

const SAMPLE = `Kubernetes rollouts without drama
Keep users online while shipping

- Split traffic with a canary Service
- Watch error rate before promoting
- Auto-rollback on SLO burn
- Document the blast radius`;

export default function HomePage() {
  const [templateId, setTemplateId] = useState("notebook");
  const [text, setText] = useState(SAMPLE);
  const [status, setStatus] = useState("Type below — preview updates live.");
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { template, filled } = useMemo(
    () => liveFill(templateId, text),
    [templateId, text],
  );

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
    if (lower.endsWith(".pdf") || file.type === "application/pdf") {
      setStatus("PDF extract lands in the next build — paste text for now.");
      return;
    }
    if (file.type.startsWith("image/")) {
      setStatus("Image OCR lands in the next build — paste text for now.");
      return;
    }
    setStatus("Unsupported file type for MVP.");
  }

  async function exportPng() {
    setExporting(true);
    setStatus("Rendering via InkType API…");
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
      setStatus(`Exported ${data.width}×${data.height} JPEG (watermarked).`);
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
              setTemplateId(e.target.value);
              setStatus(
                `Switched to ${getTemplate(e.target.value).name} — content remapped.`,
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
              {filled.map(({ slot, text: slotText }) => (
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
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="editor-wrap" aria-label="Editor">
        <div className="editor-label">Type · words ink into the template</div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Title on first line\nOptional subtitle\n- bullet\n- bullet"}
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
          <button type="button" className="chip" onClick={() => setText(SAMPLE)}>
            Sample
          </button>
        </div>
        <p className="hint">{status}</p>
      </section>
    </div>
  );
}
