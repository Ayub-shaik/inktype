import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseContent, looksLikeTreeText } from "@inktype/core";
import {
  buildScene,
  splitFlowLine,
  suggestLayout,
  layoutArch,
  connectorsFromBoxes,
  applyLayoutOverrides,
} from "../src/index.js";

const TREE = `DevOps Content Agent
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

describe("diagram engine robustness", () => {
  it("parses arrow chains", () => {
    assert.deepEqual(splitFlowLine("A -> B → C"), ["A", "B", "C"]);
  });

  it("flow scene has n-1 dotted edges", () => {
    const scene = buildScene(
      {
        title: "Path",
        bullets: ["one", "two", "three", "four"],
        nodes: ["one", "two", "three", "four"],
      },
      "flow",
    );
    assert.equal(scene.boxes.length, 4);
    assert.equal(scene.edges.length, 3);
    assert.equal(scene.edges[0].style, "dotted");
    assert.ok(scene.edges[0].path?.length >= 2);
    for (const b of scene.boxes) {
      assert.ok(b.x >= 0 && b.x + b.w <= 1.001);
      assert.ok(b.y >= 0 && b.y + b.h <= 1.001);
    }
  });

  it("arch supports sibling columns with |", () => {
    const scene = layoutArch({
      title: "Layers",
      bullets: ["CDN | Edge", "API | Auth", "DB"],
      nodes: [],
    });
    assert.ok(scene.boxes.length >= 5);
    assert.ok(scene.edges.length >= 1);
  });

  it("auto suggests arch for layered language", () => {
    assert.equal(
      suggestLayout({
        bullets: ["frontend", "backend", "database"],
        nodes: [],
        freeform: "",
      }),
      "arch",
    );
  });

  it("empty doc does not throw", () => {
    const scene = buildScene({}, "boxes");
    assert.equal(scene.layout, "boxes");
    assert.ok(Array.isArray(scene.boxes));
  });

  it("detects vertical ASCII flowchart as stack", () => {
    const doc = {
      flow: "vertical",
      freeform: "A\n│\n▼\nB\n│\n▼\nC",
      bullets: ["A", "B", "C"],
      nodes: ["A", "B", "C"],
    };
    assert.equal(suggestLayout(doc), "stack");
    const scene = buildScene(doc, "auto");
    assert.equal(scene.layout, "stack");
    assert.equal(scene.boxes.length, 3);
    assert.equal(scene.edges.length, 2);
    const long = buildScene(
      {
        flow: "vertical",
        freeform: "n8n\n▼\nToday (Friday → Automation)\n▼\nPublish",
        bullets: ["n8n", "Today (Friday → Automation)", "Publish"],
        nodes: ["n8n", "Today (Friday → Automation)", "Publish"],
      },
      "stack",
    );
    assert.equal(long.boxes.length, 3);
    assert.match(long.boxes[1].text, /Friday/);
  });

  it("parses ├── hierarchy as expandable tree with dotted splines", () => {
    assert.equal(looksLikeTreeText(TREE), true);
    const doc = parseContent(TREE);
    assert.equal(doc.kind, "tree");
    assert.equal(suggestLayout(doc), "tree");
    const scene = buildScene(doc, "auto");
    assert.equal(scene.layout, "tree");
    assert.ok(scene.boxes.length >= 16, `got ${scene.boxes.length}`);
    assert.ok(scene.edges.length >= 15);
    assert.equal(scene.edges[0].style, "dotted");
    assert.ok(scene.canvas?.height > 1350);
    assert.ok(scene.boxes.every((b) => b.y + b.h <= 1.001));
    const labels = scene.boxes.map((b) => b.text);
    assert.ok(labels.some((t) => /Monday Engine/.test(t)));
    assert.ok(labels.some((t) => /WhatsApp Publisher/.test(t)));
  });

  it("live connectors follow box order after drag overrides", () => {
    const scene = buildScene(
      {
        flow: "vertical",
        freeform: "A\n▼\nB\n▼\nC",
        bullets: ["A", "B", "C"],
        nodes: ["A", "B", "C"],
      },
      "stack",
    );
    const moved = applyLayoutOverrides(scene, {
      n0: { x: 0.2, y: 0.7 },
      n2: { x: 0.2, y: 0.1 },
    });
    assert.equal(moved.edges.length, 2);
    const first = moved.edges[0];
    assert.ok(first.points[1] < first.points[3]);
    const edges = connectorsFromBoxes(moved.boxes, "vertical", "dotted");
    assert.equal(edges.length, 2);
    assert.equal(edges[0].style, "dotted");
  });

  it("tree overrides keep parent-child topology", () => {
    const doc = parseContent(TREE);
    const scene = buildScene(doc, "tree");
    const root = scene.boxes[0];
    const child = scene.boxes[1];
    const moved = applyLayoutOverrides(scene, {
      [child.id]: { x: 0.4, y: 0.5 },
    });
    assert.ok(moved.edges.some((e) => e.from === root.id && e.to === child.id));
    assert.equal(moved.edges[0].style, "dotted");
  });
});
