/**
 * Smoke: render a notebook JPEG via the library (no HTTP).
 * Usage: npm run smoke -w inktype-api
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToBuffer, buildPackage } from "@inktype/render";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "tmp");
fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, "smoke-notebook.jpg");

const result = await renderToBuffer({
  template: "notebook",
  content: {
    brand: "pager notes",
    progress: "1/5",
    title: "InkType render smoke",
    subtitle: "Shared backend for channel + product",
    bullets: [
      "Live type stays client-side",
      "JPEG export hits this renderer",
      "LinkedIn / WA / portfolio call /v1/package",
    ],
    nodes: ["type", "ink", "ship"],
    diagram: { heading: "loop", nodes: ["type", "ink", "ship"] },
    simpleWords: "One render path. Many surfaces.",
  },
  watermark: false,
  outPath,
});

const packed = await buildPackage({
  surface: "linkedin",
  template: "notebook",
  content: {
    title: "Package check",
    bullets: ["mentor caption separate", "teaching on image"],
    simpleWords: "Don't dump the slide into the caption.",
  },
  caption: "Saw this fail in prod twice. Here's the mental model.",
});

console.log(
  JSON.stringify(
    {
      render: {
        outPath: result.outPath,
        bytes: result.buffer.length,
        size: `${result.width}x${result.height}`,
      },
      package: {
        ok: packed.ok,
        warnings: packed.warnings,
        bytes: packed.buffer.length,
      },
    },
    null,
    2,
  ),
);
