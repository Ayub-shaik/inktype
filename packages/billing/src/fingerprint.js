import crypto from "node:crypto";

/**
 * Preview anti-misuse: detect “type half, screenshot, type rest” stitching.
 */

export function normalizeContent(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .trim();
}

export function contentFingerprint(text) {
  const n = normalizeContent(text);
  return crypto.createHash("sha256").update(n).digest("hex").slice(0, 24);
}

export function contentLines(text) {
  return normalizeContent(text)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * True if `next` looks like an incremental extension / near-duplicate of `prev`
 * (classic half-content stitch attack).
 */
export function isPreviewFamilyMember(prevText, nextText) {
  const a = normalizeContent(prevText);
  const b = normalizeContent(nextText);
  if (!a || !b) return false;
  if (a === b) return true;
  if (b.startsWith(a) || a.startsWith(b)) return true;

  const la = contentLines(prevText);
  const lb = contentLines(nextText);
  if (!la.length || !lb.length) return false;

  const setA = new Set(la);
  const setB = new Set(lb);
  let inter = 0;
  for (const x of setA) if (setB.has(x)) inter += 1;
  const union = new Set([...setA, ...setB]).size;
  const jaccard = union ? inter / union : 0;
  if (jaccard >= 0.7) return true;

  // Shared title + most bullets
  if (la[0] && lb[0] && la[0] === lb[0] && jaccard >= 0.5) return true;
  return false;
}

export function findFamilyId(families, text) {
  for (const [id, members] of Object.entries(families || {})) {
    for (const m of members) {
      if (isPreviewFamilyMember(m.text, text)) return id;
    }
  }
  return null;
}
