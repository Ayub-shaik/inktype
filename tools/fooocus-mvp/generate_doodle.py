#!/usr/bin/env python3
"""Minimal Fooocus Gradio client for InkType doodle MVP.

Requires Fooocus running on http://127.0.0.1:7865
Usage:
  ./fooocus_env/bin/python generate_doodle.py "handdrawn doodle of a laptop on notebook paper"
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

from gradio_client import Client


DEFAULT_PROMPT = (
    "simple hand-drawn doodle sketch of a laptop computer on cream notebook paper, "
    "black ink pen, rough lines, messy margin scribbles, Excalidraw style, "
    "minimal, white background, no text, no watermark"
)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("prompt", nargs="?", default=DEFAULT_PROMPT)
    ap.add_argument("--url", default="http://127.0.0.1:7865")
    ap.add_argument(
        "--out",
        default=str(
            Path.home()
            / "Desktop/projects/inktype/packages/render/assets/doodles/laptop.png"
        ),
    )
    ap.add_argument("--negative", default="photo, realistic, 3d, text, watermark, blurry")
    args = ap.parse_args()

    print(f"Connecting to Fooocus at {args.url} …")
    client = Client(args.url)

    # Gradio 3.x API: inspect named endpoints
    # Prefer text-to-image generate if exposed; fall back to /predict variants.
    endpoints = getattr(client, "endpoints", None) or []
    print("endpoints:", [getattr(e, "api_name", None) or getattr(e, "fn_index", None) for e in endpoints][:20])

    # Common Fooocus pattern (varies by version): generate via named api
    result = None
    errors = []
    for call in (
        lambda: client.predict(args.prompt, api_name="/generate"),
        lambda: client.predict(args.prompt, args.negative, api_name="/generate"),
        lambda: client.submit(args.prompt, api_name="/generate").result(timeout=600),
    ):
        try:
            result = call()
            break
        except Exception as e:
            errors.append(str(e))
            continue

    if result is None:
        # Last resort: use view_api dump to help debug
        try:
            print(client.view_api(all_endpoints=True))
        except Exception:
            pass
        print("FAILED to call generate. Errors:")
        for e in errors:
            print(" -", e[:300])
        return 1

    print("raw result type:", type(result), repr(result)[:400])
    # Result is often a gallery list of file paths / dicts
    path = None
    if isinstance(result, (list, tuple)) and result:
        item = result[0]
        if isinstance(item, dict):
            path = item.get("name") or item.get("path") or item.get("image")
        elif isinstance(item, str):
            path = item
        elif isinstance(item, (list, tuple)) and item:
            path = item[0] if isinstance(item[0], str) else None
    elif isinstance(result, str):
        path = result
    elif isinstance(result, dict):
        path = result.get("name") or result.get("path")

    if not path or not Path(path).exists():
        print("Could not locate output image in result:", result)
        return 2

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, out)
    print(f"Saved: {out} ({out.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
