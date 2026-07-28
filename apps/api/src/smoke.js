/**
 * Smoke: local diagram layout + JPEG (no OpenClaw).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildScene } from "@inktype/diagram";
import { renderToBuffer } from "@inktype/render";
import { listPlugins } from "@inktype/plugins";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "tmp");
fs.mkdirSync(outDir, { recursive: true });

const doc = {
  title: "Canary path",
  subtitle: "Local diagram engine",
  bullets: ["ingress", "canary svc", "metrics", "promote"],
  nodes: ["ingress", "canary svc", "metrics", "promote"],
};

const scene = buildScene(doc, "flow");
const outPath = path.join(outDir, "smoke-flow.jpg");
const result = await renderToBuffer({
  template: "flow",
  content: { ...doc, brand: "InkType", simpleWords: "No AI drew these boxes." },
  watermark: false,
  outPath,
});

console.log(
  JSON.stringify(
    {
      plugins: listPlugins().map((p) => p.id),
      sceneBoxes: scene.boxes.length,
      sceneEdges: scene.edges.length,
      render: {
        outPath: result.outPath,
        bytes: result.buffer.length,
        size: `${result.width}x${result.height}`,
      },
    },
    null,
    2,
  ),
);
