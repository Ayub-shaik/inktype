"use client";

import { useCallback, useEffect, useMemo, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { pathToSvgD } from "@inktype/diagram";
import type { LayoutOverrides } from "@/lib/layoutOverrides";
import { mergeRect } from "@/lib/layoutOverrides";
import type { FontStyleId, PaperStyleId } from "@/lib/templateLabels";

type Box = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  className: string;
  kind?: string;
  style?: CSSProperties;
};

type Edge = {
  id: string;
  points?: number[];
  path?: number[][];
  style?: string;
  marker?: string;
};

type Props = {
  aspectPad: string;
  paperStyle: PaperStyleId;
  fontFamily?: FontStyleId;
  boxes: Box[];
  edges?: Edge[];
  layout?: string;
  overrides: LayoutOverrides;
  onMove: (id: string, patch: { x: number; y: number }) => void;
};

declare global {
  interface Window {
    rough?: { svg: (svg: SVGSVGElement) => { rectangle: (...a: unknown[]) => SVGElement } };
  }
}

export function CanvasBoard({
  aspectPad,
  paperStyle,
  fontFamily = "virgil",
  boxes,
  edges: edgeProp,
  layout = "stack",
  overrides,
  onMove,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    ox: number;
    oy: number;
  } | null>(null);

  const liveBoxes = useMemo(
    () =>
      boxes.map((b) => {
        const r = mergeRect(b, overrides[b.id]);
        return { ...b, ...r };
      }),
    [boxes, overrides],
  );

  const edges = edgeProp || [];

  useEffect(() => {
    const scriptId = "inktype-rough";
    function paint() {
      if (!window.rough || !frameRef.current) return;
      frameRef.current.querySelectorAll<SVGSVGElement>("svg.rough-frame").forEach((svg) => {
        const parent = svg.parentElement;
        if (!parent) return;
        const w = parent.clientWidth;
        const h = parent.clientHeight;
        if (!w || !h) return;
        svg.setAttribute("width", String(w));
        svg.setAttribute("height", String(h));
        svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
        svg.innerHTML = "";
        const g = window.rough!.svg(svg);
        const stroke = paperStyle === "dark" ? "#e7e5e4" : "#44403c";
        const fill =
          svg.getAttribute("data-fill") ||
          (paperStyle === "sticky" ? "rgba(254,249,195,0.85)" : "rgba(255,255,255,0.55)");
        svg.appendChild(
          g.rectangle(2, 2, Math.max(4, w - 4), Math.max(4, h - 4), {
            stroke,
            fill,
            strokeWidth: 1.6,
            roughness: 1.4,
            bowing: 1.1,
            fillStyle: "solid",
          }),
        );
      });
    }
    if (!document.getElementById(scriptId)) {
      const s = document.createElement("script");
      s.id = scriptId;
      s.src = "/vendor/rough.min.js";
      s.onload = () => paint();
      document.body.appendChild(s);
    } else {
      paint();
    }
    const t = window.setTimeout(paint, 50);
    return () => window.clearTimeout(t);
  }, [liveBoxes, paperStyle, edges]);

  const onPointerDown = useCallback(
    (id: string, e: ReactPointerEvent) => {
      const box = liveBoxes.find((b) => b.id === id);
      if (!box || !frameRef.current) return;
      dragRef.current = {
        id,
        startX: e.clientX,
        startY: e.clientY,
        ox: box.x,
        oy: box.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [liveBoxes],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const d = dragRef.current;
      if (!d || !frameRef.current) return;
      const bounds = frameRef.current.getBoundingClientRect();
      const dx = (e.clientX - d.startX) / bounds.width;
      const dy = (e.clientY - d.startY) / bounds.height;
      onMove(d.id, {
        x: Math.min(0.92, Math.max(0, d.ox + dx)),
        y: Math.min(0.96, Math.max(0, d.oy + dy)),
      });
    },
    [onMove],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const fontClass =
    fontFamily === "serif"
      ? "ink-serif"
      : fontFamily === "sans"
        ? "ink-sans"
        : fontFamily === "mono"
          ? "ink-mono"
          : "ink-virgil";

  return (
    <div className="s-stage">
      <div
        ref={frameRef}
        className={`s-canvas-frame paper-${paperStyle}`}
        style={{ ["--pad" as string]: aspectPad }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className={`s-canvas paper-${paperStyle} ${fontClass}`}>
          {paperStyle === "clipped" ? (
            <>
              <span className="tape tape-a" aria-hidden />
              <span className="tape tape-b" aria-hidden />
            </>
          ) : null}
          <div className="craft-grain" aria-hidden />
          <div className="craft-vignette" aria-hidden />
          <div className="craft-warp" aria-hidden />
          <svg className="s-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            {edges.map((e) => {
              const dash =
                e.style === "dashed" || e.style === "dotted" || e.style === "spline" || !e.style
                  ? "1.8 2.4"
                  : undefined;
              if (e.path && e.path.length >= 2) {
                return (
                  <path
                    key={e.id}
                    d={pathToSvgD(e.path, 100)}
                    fill="none"
                    stroke="#44403c"
                    strokeWidth={0.7}
                    strokeLinecap="round"
                    strokeDasharray={dash}
                  />
                );
              }
              const [x1, y1, x2, y2] = e.points || [0, 0, 0, 0];
              return (
                <line
                  key={e.id}
                  x1={x1 * 100}
                  y1={y1 * 100}
                  x2={x2 * 100}
                  y2={y2 * 100}
                  stroke="#44403c"
                  strokeWidth={0.7}
                  strokeLinecap="round"
                  strokeDasharray={dash}
                />
              );
            })}
          </svg>
          {liveBoxes.map((b, i) => {
            const messyRot = paperStyle === "messy" ? ((i % 5) - 2) * 0.7 : 0;
            return (
              <div
                key={b.id}
                className={`s-slot ${b.className} draggable paper-${paperStyle}`}
                style={{
                  left: `${b.x * 100}%`,
                  top: `${b.y * 100}%`,
                  width: `${b.w * 100}%`,
                  height: `${b.h * 100}%`,
                  transform: messyRot ? `rotate(${messyRot}deg)` : undefined,
                  ...b.style,
                }}
                onPointerDown={(ev) => onPointerDown(b.id, ev)}
              >
                <svg
                  className="rough-frame"
                  data-fill={
                    (b.style?.background as string) ||
                    "rgba(255,255,255,0.55)"
                  }
                  aria-hidden
                />
                <span className="s-slot-text">{b.text}</span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="s-canvas-hint">
        {layout === "tree"
          ? "Hierarchy — dotted splines · drag boxes · paper grows with content"
          : "Drag blocks — dotted spline connectors follow"}
      </p>
    </div>
  );
}
