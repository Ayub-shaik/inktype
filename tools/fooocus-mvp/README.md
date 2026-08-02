# Fooocus MVP — DO NOT run on this laptop while RAM is tight

## Verdict (2026-07-29/30)

**Laptop cannot safely run Fooocus SDXL right now.**

| Resource | Observed |
|----------|----------|
| GPU | GTX 1650 **4GB** VRAM |
| System RAM | 19GB total; often only **~5GB free** with normal apps |
| Fooocus mode | `--always-low-vram` → **offloads UNet weights into system RAM** |
| Result | Free RAM fell to **~0.5GB** → machine hung |

CUDA/torch itself works (`torch 2.1.0+cu121` sees the 1650). The hang is **RAM pressure from SDXL + low-VRAM offload**, not a missing GPU driver.

## What was installed (keep offline; do not auto-start)

- Clone: `~/Desktop/projects/Fooocus`
- Venv: `Fooocus/fooocus_env` (~5GB)
- Checkpoint: `models/checkpoints/juggernautXL_v8Rundiffusion.safetensors` (~6.7GB)
- Helpers: `inktype/tools/fooocus-mvp/` (`mvp.sh`, `headless_smoke.py`, `generate_doodle.py`)
- Optional plugin stub: `inktype/packages/plugins/src/fooocusDoodle.js` (env-gated)

## Hard rules

1. **Do not** start Fooocus / `headless_smoke.py` on this machine unless **≥12GB RAM is free** and heavy apps are closed.
2. Prefer generating doodles on a **remote GPU** (Colab / RunPod / bigger box), then copy PNGs into `packages/render/assets/doodles/`.
3. InkType diagrams stay on **Rough / layout engine** — Fooocus is assets-only, never the primary renderer.
4. If disk is tight, delete `Fooocus/models/checkpoints/*.safetensors` (~6.7GB) and/or the whole `~/Desktop/projects/Fooocus` tree.

## Safer alternatives for InkType craft

- Pre-draw SVG doodles / Rough paths (no SD)
- Smaller SD1.5 / tiny models only on a machine with ≥16GB free RAM + ≥8GB VRAM
- Cloud Fooocus/API for one-off asset packs

## Status

**Blocked on this laptop.** MVP scaffolding exists; live generation aborted after RAM hang.
