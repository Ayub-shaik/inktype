import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * OpenClaw used ONLY to structure prose → ContentDoc fields.
 * Never asks the model for coordinates, boxes, or edges.
 */

function loadToken() {
  let token =
    process.env.OPENCLAW_GATEWAY_TOKEN ||
    process.env.OPENCLAW_TOKEN ||
    "";
  if (!token) {
    try {
      const cfg = JSON.parse(
        fs.readFileSync(
          path.join(os.homedir(), ".openclaw", "openclaw.json"),
          "utf8",
        ),
      );
      token = cfg?.gateway?.auth?.token || "";
    } catch {
      /* ignore */
    }
  }
  return token;
}

export async function structureWithOpenClaw(text, ctx = {}) {
  const host = process.env.OPENCLAW_HOST || "127.0.0.1";
  const port = Number(process.env.OPENCLAW_PORT || 18789);
  const token = loadToken();
  if (!token) {
    throw new Error("OpenClaw token missing — local parse.content is preferred");
  }

  const system = `You structure messy notes for InkType.
Return ONLY JSON:
{
  "title": "string",
  "subtitle": "string",
  "bullets": ["..."],
  "nodes": ["short node labels for diagrams"],
  "suggestedTemplate": "notebook|flow|arch|compare|boxes",
  "suggestedLayout": "flow|stack|arch|boxes"
}
Rules:
- Do NOT invent facts.
- Do NOT output coordinates, x/y/w/h, SVG, or drawing instructions.
- nodes should be short (2-5 words) suitable for diagram boxes.
- Prefer suggestedLayout=arch when content is layered (FE/BE/DB).
- Prefer flow when steps/process.`;

  const res = await fetch(`http://${host}:${port}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: ctx.model || "openclaw/default",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: String(text || "").slice(0, 12_000) },
      ],
    }),
    signal: AbortSignal.timeout(ctx.timeoutMs || 90_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenClaw ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "";
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("OpenClaw returned no JSON object");
  }
  const doc = JSON.parse(raw.slice(start, end + 1));
  // Strip any accidental geometry keys
  delete doc.boxes;
  delete doc.edges;
  delete doc.x;
  delete doc.y;
  delete doc.elements;
  return {
    doc: {
      title: doc.title || "",
      subtitle: doc.subtitle || "",
      bullets: doc.bullets || [],
      nodes: doc.nodes || doc.bullets || [],
      freeform: text,
    },
    suggestedTemplate: doc.suggestedTemplate || "notebook",
    suggestedLayout: doc.suggestedLayout || "flow",
    source: "openclaw",
  };
}
