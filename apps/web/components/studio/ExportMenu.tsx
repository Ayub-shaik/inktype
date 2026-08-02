"use client";

import { useEffect, useRef, useState } from "react";

export type ExportTarget =
  | "jpeg"
  | "png"
  | "svg"
  | "json"
  | "clipboard"
  | "markdown"
  | "excalidraw"
  | "linkedin"
  | "whatsapp"
  | "twitter";

type Props = {
  busy?: boolean;
  onExport: (target: ExportTarget) => void;
};

const OPTIONS: { id: ExportTarget; label: string; group: "Download" | "Export to" }[] = [
  { id: "jpeg", label: "JPEG image", group: "Download" },
  { id: "png", label: "PNG image", group: "Download" },
  { id: "svg", label: "SVG vector", group: "Download" },
  { id: "excalidraw", label: "Excalidraw (.excalidraw)", group: "Download" },
  { id: "json", label: "Scene JSON", group: "Download" },
  { id: "clipboard", label: "Copy image", group: "Export to" },
  { id: "markdown", label: "Copy Markdown", group: "Export to" },
  { id: "linkedin", label: "LinkedIn", group: "Export to" },
  { id: "whatsapp", label: "WhatsApp", group: "Export to" },
  { id: "twitter", label: "X / Twitter", group: "Export to" },
];

export function ExportMenu({ busy, onExport }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="export-menu" ref={ref}>
      <button
        type="button"
        className="s-btn primary"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {busy ? "Working…" : "Download ▾"}
      </button>
      {open ? (
        <div className="export-popover" role="menu">
          <p className="export-group">Download</p>
          {OPTIONS.filter((o) => o.group === "Download").map((o) => (
            <button
              key={o.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onExport(o.id);
              }}
            >
              {o.label}
            </button>
          ))}
          <p className="export-group">Export to</p>
          {OPTIONS.filter((o) => o.group === "Export to").map((o) => (
            <button
              key={o.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onExport(o.id);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
