#!/usr/bin/env node
/**
 * InkType MCP — exposes LOCAL tools to agents.
 * Layout/render never go through OpenClaw.
 * content.structure is gated by INKTYPE_ALLOW_LLM=1.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { TEMPLATES, parseContent } from "@inktype/core";
import { buildScene, suggestLayout } from "@inktype/diagram";
import { listPlugins, runPlugin } from "@inktype/plugins";
import { renderToBuffer } from "@inktype/render";

const allowLlm = process.env.INKTYPE_ALLOW_LLM === "1";

const server = new Server(
  { name: "inktype", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "inktype_list_templates",
      description: "List product templates and local plugins",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "inktype_parse_content",
      description: "Local heuristic parse of notes → ContentDoc (no AI)",
      inputSchema: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    },
    {
      name: "inktype_layout",
      description:
        "Build diagram scene (boxes/edges) locally. layout: flow|stack|arch|boxes|auto",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string" },
          doc: { type: "object" },
          layout: {
            type: "string",
            enum: ["flow", "stack", "arch", "boxes", "auto"],
          },
        },
      },
    },
    {
      name: "inktype_render",
      description: "Render template or scene to JPEG (Playwright, local craft)",
      inputSchema: {
        type: "object",
        properties: {
          template: { type: "string" },
          text: { type: "string" },
          content: { type: "object" },
          layout: { type: "string" },
          watermark: { type: "boolean" },
        },
      },
    },
    {
      name: "inktype_structure",
      description:
        "OPTIONAL OpenClaw: structure messy text into ContentDoc fields only (no geometry). Requires INKTYPE_ALLOW_LLM=1",
      inputSchema: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const name = req.params.name;
  const args = req.params.arguments || {};

  try {
    if (name === "inktype_list_templates") {
      return json({
        templates: TEMPLATES,
        plugins: listPlugins(),
        allowLlm,
      });
    }
    if (name === "inktype_parse_content") {
      return json(parseContent(args.text || ""));
    }
    if (name === "inktype_layout") {
      const doc = args.doc || parseContent(args.text || "");
      const layout = args.layout || "auto";
      const scene = buildScene(doc, layout);
      return json({
        suggested: suggestLayout(doc),
        scene,
      });
    }
    if (name === "inktype_render") {
      const result = await renderToBuffer({
        template: args.template || "flow",
        content: args.content || parseContent(args.text || ""),
        layout: args.layout,
        watermark: args.watermark ?? false,
        format: "jpeg",
      });
      return json({
        width: result.width,
        height: result.height,
        format: result.format,
        imageBase64: result.buffer.toString("base64"),
      });
    }
    if (name === "inktype_structure") {
      if (!allowLlm) {
        return json({
          error:
            "LLM disabled. Use inktype_parse_content + inktype_layout. Set INKTYPE_ALLOW_LLM=1 to enable.",
        });
      }
      const out = await runPlugin(
        "content.structure",
        { text: args.text },
        { allowLlm: true },
      );
      return json(out);
    }
    return json({ error: `Unknown tool ${name}` });
  } catch (err) {
    return json({ error: String(err?.message || err) });
  }
});

function json(obj) {
  return {
    content: [{ type: "text", text: JSON.stringify(obj, null, 2) }],
  };
}

const transport = new StdioServerTransport();
await server.connect(transport);
