/**
 * Optional Fooocus doodle plugin — env-gated MVP.
 *
 * FOOOCUS_URL=http://127.0.0.1:7865
 * FOOOCUS_ENABLED=1
 *
 * Does NOT replace diagram layout. Generates decorative assets only.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOODLE_DIR = path.resolve(
  __dirname,
  "../../render/assets/doodles",
);

export function fooocusEnabled() {
  return (
    process.env.FOOOCUS_ENABLED === "1" ||
    process.env.INKTYPE_FOOOCUS === "1"
  );
}

export function fooocusUrl() {
  return (
    process.env.FOOOCUS_URL ||
    process.env.INKTYPE_FOOOCUS_URL ||
    "http://127.0.0.1:7865"
  ).replace(/\/$/, "");
}

/** Keyword → doodle prompt for handwritten paper craft. */
export function doodlePromptFor(text = "") {
  const t = String(text).toLowerCase();
  if (/docker|container|k8s|kubernetes|pod/.test(t)) {
    return {
      id: "docker",
      prompt:
        "simple hand-drawn doodle of a docker shipping container, black ink on cream notebook paper, rough sketch, Excalidraw style, minimal, no text",
    };
  }
  if (/laptop|computer|desktop|mac|publisher|agent/.test(t)) {
    return {
      id: "laptop",
      prompt:
        "simple hand-drawn doodle of a laptop computer, black ink on cream notebook paper, rough sketch, Excalidraw style, minimal, no text",
    };
  }
  if (/sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday|day|engine/.test(t)) {
    return {
      id: "sun",
      prompt:
        "simple hand-drawn doodle of a sun with rays, black and orange ink on cream notebook paper, rough sketch, Excalidraw style, minimal, no text",
    };
  }
  return {
    id: "messy-ink",
    prompt:
      "simple hand-drawn messy ink scribbles and coffee stain on cream notebook paper, rough sketch, Excalidraw style, minimal, no text",
  };
}

/**
 * Check if Fooocus Gradio is up.
 */
export async function pingFooocus(timeoutMs = 2500) {
  const url = fooocusUrl();
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(`${url}/`, { signal: ac.signal });
    return { ok: res.ok || res.status < 500, status: res.status, url };
  } catch (err) {
    return { ok: false, error: String(err?.message || err), url };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Return cached doodle path if present; otherwise null.
 * Generation is handled by tools/fooocus-mvp/generate_doodle.py (Gradio client).
 */
export function cachedDoodlePath(id) {
  fs.mkdirSync(DOODLE_DIR, { recursive: true });
  for (const ext of ["png", "jpg", "jpeg", "webp"]) {
    const p = path.join(DOODLE_DIR, `${id}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function resolveDoodleAsset(text) {
  const { id, prompt } = doodlePromptFor(text);
  const cached = cachedDoodlePath(id);
  return {
    id,
    prompt,
    path: cached,
    ready: Boolean(cached),
    fooocus: fooocusEnabled() ? await pingFooocus() : { ok: false, skipped: true },
  };
}
