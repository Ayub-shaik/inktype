import { FORBIDDEN_PHRASES, SURFACES } from "./sizes.js";
import { renderToBuffer } from "./screenshot.js";

/**
 * Scan caption + fold text for banned channel phrases.
 * @param {string} text
 */
export function findForbidden(text) {
  const hay = String(text || "");
  return FORBIDDEN_PHRASES.filter((p) =>
    hay.toLowerCase().includes(p.toLowerCase()),
  );
}

/**
 * Build a channel-ready package: image + caption hygiene.
 * Posting (WhatsApp Playwright / LinkedIn paste / portfolio sync) stays in automation.
 *
 * @param {object} body
 * @param {'linkedin'|'whatsapp'|'portfolio'|'inktype'} body.surface
 * @param {string} [body.template]
 * @param {object} body.content
 * @param {string} [body.caption]
 * @param {boolean} [body.watermark]
 * @param {string} [body.outPath]
 */
export async function buildPackage(body = {}) {
  const surfaceKey = String(body.surface || "inktype").toLowerCase();
  const surface = SURFACES[surfaceKey] || SURFACES.inktype;
  const content = { ...(body.content || {}) };

  content.brand = content.brand || surface.brand;
  content.footerTitle = content.footerTitle || surface.footerTitle;
  content.aspect = content.aspect || body.aspect || surface.defaultAspect;

  const watermark =
    body.watermark ??
    (surfaceKey === "inktype" ? surface.watermark : false);

  const scanText = [
    body.caption,
    content.title,
    content.subtitle,
    content.simpleWords,
    content.fold,
    ...(content.bullets || []),
  ]
    .filter(Boolean)
    .join("\n");

  const warnings = findForbidden(scanText);

  const rendered = await renderToBuffer({
    template: body.template || content.template || "notebook",
    content,
    aspect: content.aspect,
    watermark,
    format: body.format || "jpeg",
    quality: body.quality,
    outPath: body.outPath,
  });

  return {
    surface: surfaceKey,
    series: surface.series || null,
    brand: content.brand,
    template: rendered.template,
    width: rendered.width,
    height: rendered.height,
    format: rendered.format,
    mime: rendered.mime,
    buffer: rendered.buffer,
    outPath: rendered.outPath,
    caption: body.caption || "",
    warnings,
    ok: warnings.length === 0,
    note:
      surfaceKey === "linkedin"
        ? "Caption is mentor voice; teaching stays on the image. auto_post=false — paste manually."
        : surfaceKey === "portfolio"
          ? "Sync image + step into portfolio published.json via insights-ops."
          : surfaceKey === "whatsapp"
            ? "Hand off JPEG to content-ops Telegram approve → WA Web publish."
            : "Public InkType export.",
  };
}
