import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildScene,
  splitFlowLine,
  suggestLayout,
  layoutArch,
} from "../src/index.js";

describe("diagram engine robustness", () => {
  it("parses arrow chains", () => {
    assert.deepEqual(splitFlowLine("A -> B → C"), ["A", "B", "C"]);
  });

  it("flow scene has n-1 edges", () => {
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

  it("clips long node labels", () => {
    const long = "x".repeat(80);
    const scene = buildScene({ nodes: [long], bullets: [long] }, "boxes");
    assert.ok(scene.boxes[0].text.length <= 48);
  });
});
