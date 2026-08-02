#!/usr/bin/env bash
# InkType ↔ Fooocus MVP helper
# SAFETY: start refuses unless MemAvailable >= 12GB (see README.md).
set -euo pipefail
FOO="${FOOOCUS_ROOT:-$HOME/Desktop/projects/Fooocus}"
INK="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${GRADIO_SERVER_PORT:-7865}"
LOG="/tmp/fooocus-mvp.log"
PIDF="/tmp/fooocus-mvp.pid"
MIN_AVAIL_MB="${FOOOCUS_MIN_AVAIL_RAM_MB:-12000}"

require_ram() {
  local avail_mb
  avail_mb=$(awk '/MemAvailable:/ {printf "%d", $2/1024}' /proc/meminfo)
  if (( avail_mb < MIN_AVAIL_MB )); then
    echo "REFUSING: MemAvailable=${avail_mb}MB < ${MIN_AVAIL_MB}MB"
    echo "Fooocus low-VRAM offload previously hung this laptop (~0.5GB free)."
    echo "See $INK/tools/fooocus-mvp/README.md"
    exit 2
  fi
  echo "MemAvailable=${avail_mb}MB (ok)"
}

cmd="${1:-}"
shift || true

case "$cmd" in
  start)
    require_ram
    if [[ -f "$PIDF" ]] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then
      echo "already running pid=$(cat "$PIDF")"
      exit 0
    fi
    cd "$FOO"
    nohup "$FOO/fooocus_env/bin/python" launch.py \
      --listen 127.0.0.1 \
      --port "$PORT" \
      --always-low-vram \
      --disable-in-browser \
      --disable-analytics \
      --preset lightning \
      >"$LOG" 2>&1 &
    echo $! >"$PIDF"
    echo "started pid=$(cat "$PIDF") log=$LOG url=http://127.0.0.1:$PORT"
    ;;
  stop)
    if [[ -f "$PIDF" ]]; then
      kill "$(cat "$PIDF")" 2>/dev/null || true
      rm -f "$PIDF"
    fi
    pkill -f "Fooocus/fooocus_env/bin/python launch.py" 2>/dev/null || true
    pkill -f "headless_smoke.py" 2>/dev/null || true
    echo stopped
    ;;
  status)
    avail_mb=$(awk '/MemAvailable:/ {printf "%d", $2/1024}' /proc/meminfo)
    echo "MemAvailable=${avail_mb}MB (need >=${MIN_AVAIL_MB}MB to start)"
    free -h | head -2
    if [[ -f "$PIDF" ]] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then
      echo "running pid=$(cat "$PIDF")"
      curl -s -o /dev/null -w "http:%{http_code}\n" "http://127.0.0.1:$PORT/" || true
      nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu --format=csv
    else
      echo "not running"
    fi
    ;;
  logs)
    tail -n "${1:-80}" "$LOG"
    ;;
  *)
    echo "usage: $0 {start|stop|status|logs}"
    exit 1
    ;;
esac
