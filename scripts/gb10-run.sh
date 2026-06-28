#!/usr/bin/env bash
set -euo pipefail

NAME=gb10-vllm
PORT=8000
MODEL=nvidia/NVIDIA-Nemotron-Nano-9B-v2
SERVED=gb10-local-text
IMAGE=nvcr.io/nvidia/vllm:26.05.post1-py3
PIDFILE="$HOME/.gb10-cloudflared.pid"
LOGDIR="$HOME/gb10-logs"

usage() {
  printf 'Usage: %s [--help|--logs|--stop]\n' "${0##*/}"
  printf '\n'
  printf 'Starts Nemotron via vLLM and Cloudflare Tunnel for 1stSight.\n'
  printf '\n'
  printf 'Required env:\n'
  printf '  GB10_OPENAI_API_KEY\n'
  printf '  CLOUDFLARED_TOKEN\n'
}

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  usage
  exit 0
fi

if [ "${1:-}" = "--logs" ]; then
  docker logs -f "$NAME"
  exit 0
fi

if [ "${1:-}" = "--stop" ]; then
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  [ -f "$PIDFILE" ] && kill "$(cat "$PIDFILE")" >/dev/null 2>&1 || true
  rm -f "$PIDFILE"
  echo "stopped vLLM + cloudflared"
  exit 0
fi

: "${GB10_OPENAI_API_KEY:?set GB10_OPENAI_API_KEY}"
: "${CLOUDFLARED_TOKEN:?set CLOUDFLARED_TOKEN}"

mkdir -p "$LOGDIR" "$HOME/.cache/huggingface"

docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d \
  --name "$NAME" \
  --gpus all \
  --ipc=host \
  --ulimit memlock=-1 \
  --ulimit stack=67108864 \
  -p "$PORT:8000" \
  -v "$HOME/.cache/huggingface:/root/.cache/huggingface" \
  "$IMAGE" \
  python3 -m vllm.entrypoints.openai.api_server \
  --model "$MODEL" \
  --served-model-name "$SERVED" \
  --host 0.0.0.0 \
  --port 8000 \
  --gpu-memory-utilization 0.85 \
  --max-model-len 8192 \
  --max-num-seqs 64 \
  --api-key "$GB10_OPENAI_API_KEY" \
  --trust-remote-code \
  --mamba_ssm_cache_dtype float32

echo "waiting for vLLM..."
for _ in $(seq 1 120); do
  if curl -fsS "http://localhost:$PORT/v1/models" -H "Authorization: Bearer $GB10_OPENAI_API_KEY" >/dev/null 2>&1; then
    break
  fi
  sleep 5
done

curl -fsS "http://localhost:$PORT/v1/models" -H "Authorization: Bearer $GB10_OPENAI_API_KEY" >/dev/null

[ -f "$PIDFILE" ] && kill "$(cat "$PIDFILE")" >/dev/null 2>&1 || true
nohup cloudflared tunnel run --token "$CLOUDFLARED_TOKEN" > "$LOGDIR/cloudflared.log" 2>&1 &
echo $! > "$PIDFILE"

echo "started"
echo "local:  http://localhost:$PORT/v1"
echo "public: https://gb10.adoreblvnk.com/v1"
