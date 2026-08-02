#!/usr/bin/env bash
# Start Fooocus in low-VRAM mode for InkType doodle MVP (GTX 1650 4GB).
# SAFETY: aborts unless enough free RAM — low-vram offload hung this laptop at ~0.5GB free.
set -euo pipefail
FOO="${FOOOCUS_ROOT:-$HOME/Desktop/projects/Fooocus}"
MIN_AVAIL_MB="${FOOOCUS_MIN_AVAIL_RAM_MB:-12000}"

avail_mb=$(awk '/MemAvailable:/ {printf "%d", $2/1024}' /proc/meminfo)
if (( avail_mb < MIN_AVAIL_MB )); then
  echo "REFUSING to start Fooocus: MemAvailable=${avail_mb}MB < ${MIN_AVAIL_MB}MB"
  echo "Last time low-VRAM SDXL offload drove free RAM to ~0.5GB and hung the laptop."
  echo "Close apps / free RAM, or generate doodles on a remote GPU instead."
  echo "See: inktype/tools/fooocus-mvp/README.md"
  exit 2
fi

if [[ ! -d "$FOO" ]]; then
  echo "Fooocus not found at $FOO"
  exit 1
fi
PY="$FOO/fooocus_env/bin/python"
if [[ ! -x "$PY" ]]; then
  echo "Missing venv at $FOO/fooocus_env"
  exit 1
fi
cd "$FOO"
export GRADIO_SERVER_PORT="${GRADIO_SERVER_PORT:-7865}"
exec "$PY" launch.py \
  --listen 127.0.0.1 \
  --port "$GRADIO_SERVER_PORT" \
  --always-low-vram \
  --disable-in-browser \
  --disable-analytics \
  "$@"
