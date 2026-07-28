import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { CANVAS, DEFAULT_EXPORT } from "./sizes.js";
import { buildHtml } from "./templates.js";

/**
 * Render a template to JPEG/PNG buffer (Playwright).
 * @param {object} input
 * @param {string} [input.template]
 * @param {object} [input.content] merged into template opts
 * @param {'story'|'square'|'wide'} [input.aspect]
 * @param {'jpeg'|'png'} [input.format]
 * @param {number} [input.quality]
 * @param {boolean} [input.watermark]
 * @param {string} [input.outPath] optional write path
 */
export async function renderToBuffer(input = {}) {
  const content = { ...(input.content || input) };
  delete content.template;
  delete content.content;
  delete content.format;
  delete content.quality;
  delete content.outPath;
  delete content.returnHtml;

  const template = input.template || content.template || "notebook";
  const aspectKey =
    input.aspect ||
    content.aspect ||
    (template === "flow" ? "wide" : "story");
  const canvas = CANVAS[aspectKey] || CANVAS.story;
  const format = (input.format || DEFAULT_EXPORT.format).toLowerCase();
  const quality = input.quality ?? DEFAULT_EXPORT.quality;
  const watermark =
    input.watermark ?? content.watermark ?? false;

  const html = buildHtml(template, {
    ...content,
    aspect: aspectKey,
    watermark,
  });

  if (input.returnHtml) {
    return { html, width: canvas.width, height: canvas.height, format, template };
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
      viewport: { width: canvas.width, height: canvas.height },
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
    });

    if (input.outPath) {
      fs.mkdirSync(path.dirname(input.outPath), { recursive: true });
      fs.writeFileSync(input.outPath, buffer);
    }

    return {
      buffer,
      width: canvas.width,
      height: canvas.height,
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
