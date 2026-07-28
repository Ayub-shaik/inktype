import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  appendInktypeCta,
  inktypeShareUrl,
  ctaVariants,
} from "../src/growth.js";

describe("LinkedIn growth CTA", () => {
  it("has niche CTA variants", () => {
    assert.ok(ctaVariants().length >= 4);
    assert.match(ctaVariants()[0], /diagrams/i);
  });

  it("builds UTM link when public URL set", () => {
    process.env.INKTYPE_PUBLIC_URL = "https://inktype.example";
    const url = inktypeShareUrl({ template: "flow" });
    assert.match(url, /utm_source=linkedin/);
    assert.match(url, /utm_campaign=pager_notes/);
    assert.match(url, /t=flow/);
  });

  it("appends CTA under mentor caption without replacing it", () => {
    process.env.INKTYPE_PUBLIC_URL = "https://inktype.example";
    const out = appendInktypeCta("Saw this fail in prod twice.", {
      template: "notebook",
      variant: 0,
    });
    assert.match(out, /^Saw this fail in prod twice\./);
    assert.match(out, /Create diagrams like this quickly/);
    assert.match(out, /inktype\.example/);
  });

  it("no-ops CTA when public URL missing", () => {
    delete process.env.INKTYPE_PUBLIC_URL;
    delete process.env.NEXT_PUBLIC_INKTYPE_PUBLIC_URL;
    const out = appendInktypeCta("Mentor only.");
    assert.equal(out, "Mentor only.");
  });
});
