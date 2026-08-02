"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  aspectPadding,
  getTemplate,
  parseContent,
  liveFill,
} from "@inktype/core";
import {
  buildScene,
  suggestLayout,
  suggestTemplate,
  applyLayoutOverrides,
  pathToSvgD,
  measureCanvas,
} from "@inktype/diagram";
import { CanvasBoard } from "@/components/studio/CanvasBoard";
import { TemplateStrip } from "@/components/studio/TemplateStrip";
import { ExportMenu, type ExportTarget } from "@/components/studio/ExportMenu";
import { PaywallModal } from "@/components/studio/PaywallModal";
import type { LayoutOverrides } from "@/lib/layoutOverrides";
import {
  PAPER_STYLES,
  FONT_STYLES,
  type PaperStyleId,
  type FontStyleId,
} from "@/lib/templateLabels";

const API = "";
const DIAGRAM_IDS = new Set(["flow", "stack", "arch", "boxes", "tree"]);

const SAMPLE = `DevOps Content Agent
├── Monday Engine
├── Tuesday Engine
├── Wednesday Engine
├── Thursday Engine
├── Friday Engine
├── Saturday Engine
├── Sunday Engine
│
├── Topic Database
├── Sequence Tracker
├── Duplicate Checker
├── AI Writer
├── Fact Verifier
├── Image Prompt Generator
├── Hashtag Generator
├── Emoji Formatter
└── WhatsApp Publisher`;

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

function pickTemplateForText(raw: string) {
  return suggestTemplate(parseContent(raw));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function apiHeaders(guest: string, extra: Record<string, string> = {}) {
  return {
    "Content-Type": "application/json",
    "x-inktype-guest-key": guest,
    ...extra,
  };
}

function sceneToSvg(
  scene: {
    boxes?: { id: string; text: string; x: number; y: number; w: number; h: number }[];
    edges?: { id: string; points?: number[]; path?: number[][]; style?: string }[];
    labels?: { id: string; text: string; x: number; y: number; w: number; h: number }[];
    canvas?: { width?: number; height?: number };
  },
  fontFamily: FontStyleId = "virgil",
) {
  const measured = measureCanvas(scene);
  const W = measured.width;
  const H = measured.height;
  const font =
    fontFamily === "serif"
      ? "Georgia, serif"
      : fontFamily === "sans"
        ? "IBM Plex Sans, sans-serif"
        : fontFamily === "mono"
          ? "ui-monospace, monospace"
          : "Virgil, Comic Sans MS, cursive";
  const esc = (s: string) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<rect width="100%" height="100%" fill="#faf7f2"/>`,
  ];
  for (const e of scene.edges || []) {
    if (e.path && e.path.length >= 2) {
      const scaled = e.path.map(([x, y]) => [x * W, y * H]);
      const d = pathToSvgD(scaled as number[][], 1);
      parts.push(
        `<path d="${d}" fill="none" stroke="#44403c" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 5"/>`,
      );
      continue;
    }
    const [x1, y1, x2, y2] = e.points || [0, 0, 0, 0];
    parts.push(
      `<line x1="${x1 * W}" y1="${y1 * H}" x2="${x2 * W}" y2="${y2 * H}" stroke="#44403c" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 5"/>`,
    );
  }
  for (const l of scene.labels || []) {
    parts.push(
      `<text x="${(l.x + 0.01) * W}" y="${(l.y + l.h * 0.7) * H}" font-family="${font}" font-size="36" fill="#1c1917">${esc(l.text)}</text>`,
    );
  }
  for (const b of scene.boxes || []) {
    parts.push(
      `<rect x="${b.x * W}" y="${b.y * H}" width="${b.w * W}" height="${b.h * H}" rx="10" fill="#fff8e7" stroke="#44403c" stroke-width="2" stroke-dasharray="6 5"/>`,
      `<foreignObject x="${b.x * W + 10}" y="${b.y * H + 8}" width="${Math.max(20, b.w * W - 20)}" height="${Math.max(20, b.h * H - 16)}"><div xmlns="http://www.w3.org/1999/xhtml" style="font:18px ${font};color:#1c1917;line-height:1.25;word-wrap:break-word">${esc(b.text)}</div></foreignObject>`,
    );
  }
  parts.push(`</svg>`);
  return parts.join("\n");
}

function sceneToExcalidraw(
  scene: {
    boxes?: { id: string; text: string; x: number; y: number; w: number; h: number }[];
    edges?: { id: string; from: string; to: string; points?: number[]; path?: number[][] }[];
    canvas?: { width?: number; height?: number };
  },
  fontFamily: FontStyleId = "virgil",
) {
  const measured = measureCanvas(scene);
  const W = measured.width;
  const H = measured.height;
  const fontFamilyNum = fontFamily === "mono" ? 3 : fontFamily === "sans" ? 2 : 1;
  const elements: Record<string, unknown>[] = [];
  for (const b of scene.boxes || []) {
    elements.push({
      type: "rectangle",
      id: b.id,
      x: b.x * W,
      y: b.y * H,
      width: b.w * W,
      height: b.h * H,
      strokeColor: "#1e1e1e",
      backgroundColor: "#ffec99",
      fillStyle: "solid",
      roughness: 1.4,
      strokeStyle: "dashed",
      label: { text: b.text },
    });
    elements.push({
      type: "text",
      id: `${b.id}-text`,
      x: b.x * W + 8,
      y: b.y * H + 8,
      width: b.w * W - 16,
      height: b.h * H - 16,
      text: b.text,
      fontSize: 20,
      fontFamily: fontFamilyNum,
    });
  }
  for (const e of scene.edges || []) {
    const [x1, y1, x2, y2] = e.points || [0, 0, 0, 0];
    const points =
      e.path && e.path.length >= 2
        ? e.path.map(([x, y]) => [(x - x1) * W, (y - y1) * H] as [number, number])
        : [
            [0, 0] as [number, number],
            [(x2 - x1) * W, (y2 - y1) * H] as [number, number],
          ];
    elements.push({
      type: "line",
      id: e.id,
      x: x1 * W,
      y: y1 * H,
      width: (x2 - x1) * W,
      height: (y2 - y1) * H,
      points,
      strokeColor: "#1e1e1e",
      strokeStyle: "dotted",
      roughness: 1.2,
      endArrowhead: null,
      startArrowhead: null,
    });
  }
  return {
    type: "excalidraw",
    version: 2,
    source: "inktype",
    appState: { viewBackgroundColor: "#faf7f2" },
    elements,
  };
}

export default function StudioClient() {
  const [templateId, setTemplateId] = useState("tree");
  const [text, setText] = useState(SAMPLE);
  const [paperStyle, setPaperStyle] = useState<PaperStyleId>("messy");
  const [fontFamily, setFontFamily] = useState<FontStyleId>("virgil");
  const [ent, setEnt] = useState<Record<string, unknown> | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [paywall, setPaywall] = useState<{ open: boolean; reason: string }>({
    open: false,
    reason: "",
  });
  const [overrides, setOverrides] = useState<LayoutOverrides>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const gKey = useMemo(() => guestKey(), []);
  const autoOnce = useRef(true);

  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.username) setUsername(d.username);
      })
      .catch(() => {});
    refreshEntitlements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const next = pickTemplateForText(text);
    setTemplateId((cur) => {
      if (autoOnce.current) {
        autoOnce.current = false;
        return next;
      }
      // Auto-route when brain is confident about shape change
      if (next === "tree" && cur !== "tree") return "tree";
      if (cur === "notebook" && next !== "notebook") return next;
      if (
        (cur === "flow" || cur === "stack" || cur === "tree") &&
        (next === "flow" || next === "stack" || next === "tree")
      ) {
        return next;
      }
      return cur;
    });
  }, [text]);

  const isDiagram = DIAGRAM_IDS.has(templateId);

  const { template, filled, scene } = useMemo(() => {
    const t = getTemplate(templateId);
    const doc = parseContent(text);
    if (isDiagram) {
      let layout: "flow" | "stack" | "arch" | "boxes" | "tree" =
        templateId === "arch"
          ? "arch"
          : templateId === "boxes"
            ? "boxes"
            : templateId === "tree"
              ? "tree"
              : templateId === "stack"
                ? "stack"
                : "flow";
      if (templateId === "flow" || templateId === "stack" || templateId === "tree") {
        const suggested = suggestLayout(doc);
        if (suggested === "tree") layout = "tree";
        else if (doc.flow === "vertical" || suggested === "stack") layout = "stack";
        else if (suggested === "flow") layout = "flow";
      }
      const raw = buildScene(doc, layout);
      return {
        template: t,
        filled: [],
        scene: applyLayoutOverrides(raw, overrides),
      };
    }
    const live = liveFill(templateId, text);
    return { template: live.template, filled: live.filled, scene: null };
  }, [templateId, text, isDiagram, overrides]);

  const canvasBoxes = useMemo(() => {
    if (isDiagram && scene) {
      type SceneBox = {
        id: string;
        x: number;
        y: number;
        w: number;
        h: number;
        text: string;
        fill?: string;
      };
      const labels = (scene.labels || []) as SceneBox[];
      const boxes = (scene.boxes || []) as SceneBox[];
      return [
        ...labels.map((l: SceneBox) => ({
          id: l.id,
          x: l.x,
          y: l.y,
          w: l.w,
          h: l.h,
          text: l.text,
          className: l.id === "title" ? "title label" : "label",
        })),
        ...boxes.map((b: SceneBox) => ({
          id: b.id,
          x: b.x,
          y: b.y,
          w: b.w,
          h: b.h,
          text: b.text,
          className: "node",
          kind: "node",
          style: { background: b.fill } as CSSProperties,
        })),
      ];
    }
    return filled.map(({ slot, text: slotText }) => ({
      id: slot.id,
      x: slot.x,
      y: slot.y,
      w: slot.w,
      h: slot.h,
      text:
        slotText ||
        (slot.role === "title" ? "Your title…" : slot.role === "node" ? "…" : ""),
      className: `${slot.style || "body"} ${slot.role} ${slotText ? "" : "empty"}`,
    }));
  }, [isDiagram, scene, filled]);

  async function refreshEntitlements() {
    try {
      const res = await fetch(`${API}/v1/entitlements`, {
        credentials: "same-origin",
        headers: apiHeaders(gKey),
      });
      setEnt(await res.json());
    } catch {
      setEnt(null);
    }
  }

  function openPaywall(reason: string) {
    setPaywall({ open: true, reason });
  }

  function onMove(id: string, patch: { x: number; y: number }) {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function onTemplateSelect(id: string) {
    setTemplateId(id);
    setOverrides({});
  }

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
        setTemplateId(pickTemplateForText(t));
        setOverrides({});
        setToast(`Loaded ${file.name}`);
      });
      return;
    }
    setToast("Text and Markdown files only for now.");
  }

  function needsQuota(target: ExportTarget) {
    return target === "jpeg" || target === "png" || target === "clipboard";
  }

  async function runExport(target: ExportTarget) {
    if (needsQuota(target) && ent && !ent.unlimited) {
      const remaining = Number(ent.exportsRemaining ?? 0);
      if (Number.isFinite(remaining) && remaining <= 0) {
        openPaywall(
          username
            ? "You've used this month's free exports. Upgrade to Pro for clean downloads and 300 credits."
            : "Guest export used. Sign in for more free exports, or upgrade to Pro for clean unlimited-feel volume.",
        );
        return;
      }
    }

    if (target === "markdown") {
      const md = `# InkType export\n\n\`\`\`\n${text}\n\`\`\`\n`;
      await navigator.clipboard.writeText(md);
      setToast("Markdown copied");
      return;
    }
    if (target === "json") {
      const payload = {
        template: templateId,
        paperStyle,
        text,
        scene,
        overrides,
      };
      downloadBlob(
        new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
        `inktype-${templateId}.json`,
      );
      setToast("Downloaded scene JSON");
      return;
    }
    if (target === "svg") {
      const svg = sceneToSvg(
        scene || {
          boxes: canvasBoxes,
          edges: [],
          labels: [],
        },
        fontFamily,
      );
      downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `inktype-${templateId}.svg`);
      setToast("Downloaded SVG");
      return;
    }
    if (target === "excalidraw") {
      const payload = sceneToExcalidraw(
        scene || {
          boxes: canvasBoxes,
          edges: [],
        },
        fontFamily,
      );
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      downloadBlob(blob, `inktype-${templateId}.excalidraw`);
      setToast("Exported .excalidraw");
      return;
    }
    if (target === "linkedin" || target === "whatsapp" || target === "twitter") {
      const shareUrl = encodeURIComponent(
        process.env.NEXT_PUBLIC_INKTYPE_URL ||
          "https://inktype.tomorrowtools.dev",
      );
      const shareText = encodeURIComponent(text.slice(0, 200));
      if (target === "linkedin") {
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
          "_blank",
          "noopener,noreferrer",
        );
      } else if (target === "whatsapp") {
        window.open(
          `https://wa.me/?text=${shareText}%20${shareUrl}`,
          "_blank",
          "noopener,noreferrer",
        );
      } else {
        window.open(
          `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
          "_blank",
          "noopener,noreferrer",
        );
      }
      setToast("Opened share");
      return;
    }

    setBusy(true);
    setToast("Preparing download…");
    try {
      const format = target === "png" ? "png" : "jpeg";
      const res = await fetch(`${API}/v1/render`, {
        method: "POST",
        headers: apiHeaders(gKey),
        credentials: "same-origin",
        body: JSON.stringify({
          template: templateId,
          templateId,
          text,
          brand: "InkType",
          paperStyle,
          fontFamily,
          overrides,
          scene,
          format,
          guestKey: gKey,
        }),
      });

      if (res.status === 402) {
        const data = await res.json().catch(() => ({}));
        setEnt(data.entitlements || ent);
        openPaywall(data.message || data.error || "Export limit reached.");
        setToast("");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setToast(data.message || data.error || `Download failed (${res.status})`);
        return;
      }

      const blob = await res.blob();
      if (!blob || blob.size < 100) {
        setToast("Download failed — empty file");
        return;
      }

      if (target === "clipboard") {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type || "image/jpeg"]: blob }),
          ]);
          setToast("Image copied");
        } catch {
          downloadBlob(blob, `inktype-${templateId}.jpg`);
          setToast("Clipboard blocked — downloaded instead");
        }
        await refreshEntitlements();
        return;
      }

      const ext = format === "png" ? "png" : "jpg";
      downloadBlob(blob, `inktype-${templateId}.${ext}`);
      setToast("Downloaded");
      await refreshEntitlements();
    } catch (err) {
      setToast(`Download failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  const planLabel = ent?.unlimited
    ? "Pro"
    : ent?.plan
      ? String(ent.plan).charAt(0).toUpperCase() + String(ent.plan).slice(1)
      : "…";

  const aspect =
    (scene as { layout?: string } | null)?.layout === "stack" ||
    (scene as { layout?: string } | null)?.layout === "arch" ||
    (scene as { layout?: string } | null)?.layout === "tree"
      ? "story"
      : template.aspect;

  const canvasMeta = (scene as { canvas?: { width: number; height: number } } | null)?.canvas;
  const aspectPad = canvasMeta?.width && canvasMeta?.height
    ? `${(canvasMeta.height / canvasMeta.width) * 100}%`
    : aspectPadding(aspect);

  return (
    <div className="studio">
      <header className="s-header">
        <Link href="/" className="s-brand">
          Ink<span>Type</span>
        </Link>
        <div className="s-header-meta">
          <Link href="/settings" className="s-plan-chip">
            {planLabel}
            {ent && !ent.unlimited && Number.isFinite(Number(ent.exportsRemaining))
              ? ` · ${ent.exportsRemaining} left`
              : ""}
          </Link>
          {username ? <span className="s-user">{username}</span> : <span className="s-user">Guest</span>}
        </div>
        <nav className="s-nav">
          <Link href="/support">Help</Link>
          <Link href="/settings">Settings</Link>
        </nav>
      </header>

      <div className="s-workspace">
        <aside className="s-style-rail" aria-label="Paper and font">
          <p className="s-rail-title">Paper</p>
          {PAPER_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`s-style-chip ${paperStyle === s.id ? "active" : ""}`}
              title={s.hint}
              onClick={() => setPaperStyle(s.id)}
            >
              <span className={`s-style-swatch paper-${s.id}`} />
              <span>{s.label}</span>
            </button>
          ))}
          <p className="s-rail-title" style={{ marginTop: 16 }}>
            Font
          </p>
          {FONT_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`s-style-chip ${fontFamily === s.id ? "active" : ""}`}
              onClick={() => setFontFamily(s.id)}
            >
              <span>{s.label}</span>
            </button>
          ))}
        </aside>

        <div className="s-canvas-col">
          <CanvasBoard
            aspectPad={aspectPad}
            paperStyle={paperStyle}
            fontFamily={fontFamily}
            boxes={canvasBoxes}
            edges={(scene as { edges?: unknown[] } | null)?.edges as never}
            layout={(scene as { layout?: string } | null)?.layout || templateId}
            overrides={overrides}
            onMove={onMove}
          />
          <div className="s-style-mobile" aria-label="Paper style">
            {PAPER_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`s-style-chip ${paperStyle === s.id ? "active" : ""}`}
                title={s.hint}
                onClick={() => setPaperStyle(s.id)}
              >
                <span className={`s-style-swatch paper-${s.id}`} />
                <span>{s.label.split(" ")[0]}</span>
              </button>
            ))}
          </div>
          <TemplateStrip
            text={text}
            activeId={templateId}
            onSelect={onTemplateSelect}
          />
        </div>

        <aside className="s-editor-col">
          <label className="s-editor-label" htmlFor="ink-editor">
            Your content
          </label>
          <textarea
            id="ink-editor"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Paste a tree:\nRoot\n├── Child\n└── Other\n\nor a pipeline with ▼"}
            spellCheck
          />
          <div className="s-actions">
            <ExportMenu busy={busy} onExport={runExport} />
            <label className="s-btn ghost file-btn">
              Upload
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                onChange={(e) => onUpload(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          {toast ? (
            <p className="s-toast" role="status">
              {toast}
            </p>
          ) : null}
        </aside>
      </div>

      <PaywallModal
        open={paywall.open}
        reason={paywall.reason}
        onClose={() => setPaywall({ open: false, reason: "" })}
        onStatus={setToast}
      />
    </div>
  );
}
