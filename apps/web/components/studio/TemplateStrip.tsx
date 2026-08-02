"use client";

import { useMemo } from "react";
import {
  TEMPLATES,
  aspectPadding,
  liveFill,
  getTemplate,
  parseContent,
} from "@inktype/core";
import { buildScene, suggestLayout } from "@inktype/diagram";
import { templateLabel } from "@/lib/templateLabels";

const DIAGRAM_IDS = new Set(["flow", "stack", "arch", "boxes"]);

type Props = {
  text: string;
  activeId: string;
  onSelect: (id: string) => void;
};

function resolveLayout(templateId: string, text: string) {
  const doc = parseContent(text);
  if (templateId === "flow" || templateId === "stack") {
    // Auto-orient: vertical ASCII → stack, else horizontal flow
    return suggestLayout(doc) === "stack" ? "stack" : templateId === "stack" ? "stack" : "flow";
  }
  if (templateId === "arch") return "arch";
  if (templateId === "boxes") return "boxes";
  return suggestLayout(doc);
}

function TemplateThumb({
  id,
  text,
  active,
  onSelect,
}: {
  id: string;
  text: string;
  active: boolean;
  onSelect: () => void;
}) {
  const template = getTemplate(id);
  const isDiagram = DIAGRAM_IDS.has(id);
  const preview = useMemo(() => {
    const doc = parseContent(text);
    if (isDiagram) {
      const layout = resolveLayout(id, text) as "flow" | "stack" | "arch" | "boxes";
      return { scene: buildScene(doc, layout), filled: [] as { slot: { id: string; x: number; y: number; w: number; h: number; style?: string }; text: string }[] };
    }
    const live = liveFill(id, text);
    return { scene: null, filled: live.filled };
  }, [id, text, isDiagram]);

  return (
    <button
      type="button"
      className={`tpl-thumb ${active ? "active" : ""}`}
      onClick={onSelect}
      aria-pressed={active}
      aria-label={templateLabel(id)}
    >
      <div
        className="tpl-thumb-frame"
        style={{ ["--pad" as string]: aspectPadding(template.aspect) }}
      >
        <div className={`tpl-thumb-canvas ${template.background}`}>
          {preview.scene ? (
            <>
              {(preview.scene.boxes || []).slice(0, 6).map((b) => (
                <div
                  key={b.id}
                  className="tpl-bit node"
                  style={{
                    left: `${b.x * 100}%`,
                    top: `${b.y * 100}%`,
                    width: `${b.w * 100}%`,
                    height: `${b.h * 100}%`,
                  }}
                />
              ))}
            </>
          ) : (
            preview.filled.slice(0, 4).map(({ slot, text: slotText }) => (
              <div
                key={slot.id}
                className={`tpl-bit ${slot.style || "body"}`}
                style={{
                  left: `${slot.x * 100}%`,
                  top: `${slot.y * 100}%`,
                  width: `${slot.w * 100}%`,
                  height: `${slot.h * 100}%`,
                }}
              >
                {slotText?.slice(0, 18)}
              </div>
            ))
          )}
        </div>
      </div>
      <span className="tpl-thumb-label">{templateLabel(id)}</span>
    </button>
  );
}

export function TemplateStrip({ text, activeId, onSelect }: Props) {
  return (
    <section className="tpl-strip" aria-label="Layout variations">
      <p className="tpl-strip-title">Layouts for your text</p>
      <div className="tpl-strip-scroll">
        {TEMPLATES.map((t) => (
          <TemplateThumb
            key={t.id}
            id={t.id}
            text={text}
            active={activeId === t.id}
            onSelect={() => onSelect(t.id)}
          />
        ))}
      </div>
    </section>
  );
}
