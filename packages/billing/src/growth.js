/**
 * LinkedIn / channel growth CTAs for InkType.
 * Teaching stays on the image; CTA is a soft caption footer only.
 */

const VARIANTS = [
  "Create diagrams like this quickly — type below, ink above:",
  "Sketch this professionally without opening Excalidraw:",
  "Turn bullets into a hand-inked slide in minutes:",
  "Mobile-first: type the flow, get the architecture card:",
  "Pager Notes craft, your words — try InkType (guest gets 1 free image):",
];

export function publicBaseUrl() {
  return (
    process.env.INKTYPE_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_INKTYPE_PUBLIC_URL ||
    ""
  ).replace(/\/$/, "");
}

/**
 * @param {{ template?: string, campaign?: string, content?: string, variant?: number }} [opts]
 */
export function inktypeShareUrl(opts = {}) {
  const base = publicBaseUrl();
  if (!base) return "";
  const u = new URL(base.includes("://") ? base : `https://${base}`);
  if (opts.template) u.searchParams.set("t", opts.template);
  u.searchParams.set("utm_source", opts.source || "linkedin");
  u.searchParams.set("utm_medium", "social");
  u.searchParams.set("utm_campaign", opts.campaign || "pager_notes");
  if (opts.content || opts.template) {
    u.searchParams.set("utm_content", opts.content || opts.template);
  }
  return u.toString();
}

/**
 * @param {string} mentorCaption
 * @param {{ template?: string, campaign?: string, variant?: number, force?: boolean }} [opts]
 */
export function appendInktypeCta(mentorCaption, opts = {}) {
  const url = inktypeShareUrl(opts);
  if (!url && !opts.force) {
    return String(mentorCaption || "").trim();
  }
  const line =
    VARIANTS[
      Math.abs(Number(opts.variant) || 0) % VARIANTS.length
    ];
  const caption = String(mentorCaption || "").trim();
  const link = url || "{{INKTYPE_PUBLIC_URL}}";
  return [caption, "", "—", `${line}`, link].filter(Boolean).join("\n");
}

export function ctaVariants() {
  return [...VARIANTS];
}
