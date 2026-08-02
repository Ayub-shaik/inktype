import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { CANVAS, DEFAULT_EXPORT } from "./sizes.js";
import { buildHtml } from "./templates.js";
import { measureCanvas, buildScene } from "@inktype/diagram";
import { parseContent } from "@inktype/core";

/**
 * Render a template to JPEG/PNG buffer (Playwright).
 * @param {object} input
 */
export async function renderToBuffer(input = {}) {
  const content = { ...(input.content || input) };
  delete content.template;
  delete content.content;
  delete content.format;
  delete content.quality;
  delete content.outPath;
  delete content.returnHtml;
  delete content.heavyWatermark;
  delete content.blurBottom;
  delete content.watermark;

  const template =
    input.template ||
    input.templateId ||
    content.template ||
    content.templateId ||
    "notebook";
  const aspectKey =
    input.aspect ||
    content.aspect ||
    (template === "flow" ? "wide" : "story");
  const base = CANVAS[aspectKey] || CANVAS.story;
  const format = (input.format || DEFAULT_EXPORT.format).toLowerCase();
  const quality = input.quality ?? DEFAULT_EXPORT.quality;
  const watermark = Boolean(input.watermark ?? input.protection?.watermark);
  const heavyWatermark = Boolean(
    input.heavyWatermark ?? input.protection?.heavy,
  );
  const blurBottom = Boolean(input.blurBottom ?? input.protection?.blurBottom);

  let scene = input.scene || content.scene || null;
  const diagramIds = new Set(["flow", "stack", "arch", "boxes", "tree", "diagram"]);
  if (!scene && diagramIds.has(String(template))) {
    const doc =
      content.doc ||
      parseContent(content.text || content.freeform || input.text || "");
    const layout =
      template === "diagram" ? content.layout || "auto" : template;
    scene = buildScene(doc, layout);
  }
  const measured = measureCanvas(scene, base);
  const width = input.width || content.width || measured.width;
  const height = input.height || content.height || measured.height;

  const html = buildHtml(template, {
    ...content,
    aspect: aspectKey,
    width,
    height,
    watermark,
    heavyWatermark,
    blurBottom,
    paperStyle: input.paperStyle || content.paperStyle,
    fontFamily: input.fontFamily || content.fontFamily || "virgil",
    scene,
  });

  if (input.returnHtml) {
    return { html, width, height, format, template };
  }

  const tmpHtml = path.join(
    os.tmpdir(),
    `inktype-${Date.now()}-${Math.random().toString(36).slice(2)}.html`,
  );
  fs.writeFileSync(tmpHtml, html, "utf8");

  const browser = await chromium.launch({
    headless: true,
    channel: process.env.INKTYPE_USE_SYSTEM_CHROME === "0" ? undefined : "chrome",
  });

  try {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    await page.goto(`file://${tmpHtml}`, { waitUntil: "networkidle" });
    await page
      .waitForFunction(() => document.body.getAttribute("data-ready") === "1", {
        timeout: 15_000,
      })
      .catch(() => {});
    await page.waitForTimeout(300);

    const type = format === "png" ? "png" : "jpeg";
    const buffer = await page.screenshot({
      type,
      quality: type === "jpeg" ? quality : undefined,
      fullPage: false,
      clip: { x: 0, y: 0, width, height },
    });

    if (input.outPath) {
      fs.mkdirSync(path.dirname(input.outPath), { recursive: true });
      fs.writeFileSync(input.outPath, buffer);
    }

    return {
      buffer,
      width,
      height,
      format: type,
      template,
      mime: type === "png" ? "image/png" : "image/jpeg",
      outPath: input.outPath || null,
    };
  } finally {
    await browser.close();
    try {
      fs.unlinkSync(tmpHtml);
    } catch {
      /* ignore */
    }
  }
}
