#!/usr/bin/env bash
set -euo pipefail

# NVIDIA vLLM OpenAI-compatible server: https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html
MODEL_ID="${MODEL_ID:-Qwen/Qwen2.5-7B-Instruct}"
SERVED_MODEL_NAME="${SERVED_MODEL_NAME:-gb10-local-text}"
PORT="${PORT:-8000}"
GPU_MEMORY_UTILIZATION="${GPU_MEMORY_UTILIZATION:-0.85}"
MAX_MODEL_LEN="${MAX_MODEL_LEN:-8192}"
DOCKER_IMAGE="${DOCKER_IMAGE:-vllm/vllm-openai:latest}"
HF_HOME_DIR="${HF_HOME_DIR:-$HOME/.cache/huggingface}"

mkdir -p "$HF_HOME_DIR"

docker run --rm -it \
  --gpus all \
  --ipc=host \
  -p "${PORT}:8000" \
  -v "${HF_HOME_DIR}:/root/.cache/huggingface" \
  "${DOCKER_IMAGE}" \
  --model "${MODEL_ID}" \
  --served-model-name "${SERVED_MODEL_NAME}" \
  --host 0.0.0.0 \
  --port 8000 \
  --gpu-memory-utilization "${GPU_MEMORY_UTILIZATION}" \
  --max-model-len "${MAX_MODEL_LEN}"
