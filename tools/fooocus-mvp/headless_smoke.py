#!/usr/bin/env python3
"""
Headless Fooocus smoke for InkType MVP.
Loads Juggernaut SDXL in LOW_VRAM on GTX 1650 and generates one doodle PNG.
"""
from __future__ import annotations

import os
import ssl
import sys
import time
from pathlib import Path

FOO = Path(os.environ.get("FOOOCUS_ROOT", Path.home() / "Desktop/projects/Fooocus")).resolve()
OUT = Path(
    os.environ.get(
        "FOOOCUS_SMOKE_OUT",
        Path.home() / "Desktop/projects/inktype/packages/render/assets/doodles/laptop.png",
    )
)
PROMPT = os.environ.get(
    "FOOOCUS_SMOKE_PROMPT",
    "simple hand-drawn doodle of a laptop on cream notebook paper, black ink pen, rough sketch, Excalidraw style, minimal, no text, white margins",
)
NEG = "photo, realistic, 3d, watermark, letters, blurry, complex"

sys.argv = [
    "headless_smoke.py",
    "--always-low-vram",
    "--disable-analytics",
    "--disable-in-browser",
    "--preset",
    "lightning",
]
os.chdir(FOO)
sys.path.insert(0, str(FOO))
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "max_split_size_mb:128"
ssl._create_default_https_context = ssl._create_unverified_context

print("[smoke] Fooocus root", FOO)

# SAFETY: low-VRAM SDXL offload previously hung this laptop at ~0.5GB free RAM.
min_avail_mb = int(os.environ.get("FOOOCUS_MIN_AVAIL_RAM_MB", "12000"))
avail_mb = int(open("/proc/meminfo").read().split("MemAvailable:")[1].split()[0]) // 1024
print(f"[smoke] MemAvailable={avail_mb}MB (need >={min_avail_mb}MB)")
if avail_mb < min_avail_mb and os.environ.get("FOOOCUS_FORCE") != "1":
    raise SystemExit(
        f"REFUSING headless Fooocus: only {avail_mb}MB RAM available. "
        "Set FOOOCUS_FORCE=1 to override (not recommended). "
        "See inktype/tools/fooocus-mvp/README.md"
    )

t0 = time.time()

# Bootstrap like launch.py but STOP before webui
from modules.launch_util import is_installed  # noqa: E402
import torch  # noqa: E402

print(
    "[smoke] torch",
    torch.__version__,
    "cuda",
    torch.cuda.is_available(),
    torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
)

from args_manager import args  # noqa: E402
from modules import config  # noqa: E402
from modules.hash_cache import init_cache  # noqa: E402
from modules.model_loader import load_file_from_url  # noqa: E402
import ldm_patched.modules.model_management as mm  # noqa: E402

print("[smoke] vram_state", mm.vram_state, "low_vram_flag", args.always_low_vram)

# Ensure tiny aux models exist (already downloaded by prior launch)
for name, url in [
    ("xlvaeapp.pth", "https://huggingface.co/lllyasviel/misc/resolve/main/xlvaeapp.pth"),
    ("vaeapp_sd15.pth", "https://huggingface.co/lllyasviel/misc/resolve/main/vaeapp_sd15.pt"),
]:
    load_file_from_url(url=url, model_dir=config.path_vae_approx, file_name=name)

load_file_from_url(
    url="https://huggingface.co/lllyasviel/misc/resolve/main/fooocus_expansion.bin",
    model_dir=config.path_fooocus_expansion,
    file_name="pytorch_model.bin",
)

config.update_files()
init_cache(config.model_filenames, config.paths_checkpoints, config.lora_filenames, config.paths_loras)

ckpt = Path(config.paths_checkpoints[0]) / config.default_base_model_name
print("[smoke] ckpt", ckpt, "exists", ckpt.exists())
if not ckpt.exists():
    raise SystemExit(f"missing checkpoint {ckpt}")

print("[smoke] loading pipeline (UNet)…")
t1 = time.time()
import modules.default_pipeline as pipeline  # noqa: E402

pipeline.refresh_everything(
    refiner_model_name="None",
    base_model_name=config.default_base_model_name,
    loras=config.default_loras,
    vae_name=config.default_vae,
)
print(f"[smoke] pipeline ready in {time.time()-t1:.1f}s")
if torch.cuda.is_available():
    print(
        "[smoke] cuda alloc/reserved MB",
        round(torch.cuda.memory_allocated() / 1024**2, 1),
        round(torch.cuda.memory_reserved() / 1024**2, 1),
    )
print(
    "[smoke] nvidia-smi",
    os.popen(
        "nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu --format=csv,noheader"
    )
    .read()
    .strip(),
)

import modules.core as core  # noqa: E402
from modules import default_pipeline as dp  # noqa: E402

width = int(os.environ.get("FOOOCUS_SMOKE_W", "768"))
height = int(os.environ.get("FOOOCUS_SMOKE_H", "768"))
steps = int(os.environ.get("FOOOCUS_SMOKE_STEPS", "8"))
seed = int(os.environ.get("FOOOCUS_SMOKE_SEED", "42"))

print(f"[smoke] encode + sample {width}x{height} steps={steps}")
positive = dp.clip_encode([PROMPT], pool_top_k=1)
negative = dp.clip_encode([NEG], pool_top_k=1)
latent = core.generate_empty_latent(width=width, height=height, batch_size=1)

t2 = time.time()
samples = core.ksampler(
    model=dp.final_unet,
    positive=positive,
    negative=negative,
    latent=latent,
    seed=seed,
    steps=steps,
    cfg=4.0,
    sampler_name="euler",
    scheduler="normal",
    denoise=1.0,
    disable_noise=False,
    start_step=0,
    last_step=steps,
    force_full_denoise=True,
    callback_function=None,
)
print(f"[smoke] sample done in {time.time()-t2:.1f}s")

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

pixels = core.decode_vae(dp.final_vae, samples)
arr = core.pytorch_to_numpy(pixels)[0]
Image.fromarray(arr).save(OUT)
print(f"[smoke] SAVED {OUT} ({OUT.stat().st_size} bytes)")
print(
    "[smoke] nvidia-smi",
    os.popen(
        "nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu --format=csv,noheader"
    )
    .read()
    .strip(),
)
print(f"[smoke] OK total {time.time()-t0:.1f}s — laptop handled Fooocus SDXL low-vram")
