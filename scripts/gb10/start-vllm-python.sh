#!/usr/bin/env bash
set -euo pipefail

# NVIDIA vLLM OpenAI-compatible server: https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html
MODEL_ID="${MODEL_ID:-Qwen/Qwen2.5-7B-Instruct}"
SERVED_MODEL_NAME="${SERVED_MODEL_NAME:-gb10-local-text}"
PORT="${PORT:-8000}"
HOST="${HOST:-0.0.0.0}"
API_KEY="${GB10_OPENAI_API_KEY:-${API_KEY:-local-dev-token}}"
GPU_MEMORY_UTILIZATION="${GPU_MEMORY_UTILIZATION:-0.85}"
MAX_MODEL_LEN="${MAX_MODEL_LEN:-8192}"
MAX_NUM_SEQS="${MAX_NUM_SEQS:-64}"
MAMBA_SSM_CACHE_DTYPE="${MAMBA_SSM_CACHE_DTYPE:-float32}"
TRUST_REMOTE_CODE="${TRUST_REMOTE_CODE:-1}"

VLLM_ARGS=(
  --model "${MODEL_ID}"
  --served-model-name "${SERVED_MODEL_NAME}"
  --host "${HOST}"
  --port "${PORT}"
  --gpu-memory-utilization "${GPU_MEMORY_UTILIZATION}"
  --max-model-len "${MAX_MODEL_LEN}"
  --max-num-seqs "${MAX_NUM_SEQS}"
)

if [ -n "$API_KEY" ]; then
  VLLM_ARGS+=(--api-key "$API_KEY")
fi

if [ "$TRUST_REMOTE_CODE" = "1" ]; then
  VLLM_ARGS+=(--trust-remote-code)
fi

if [ -n "$MAMBA_SSM_CACHE_DTYPE" ]; then
  # NVIDIA Nemotron Nano vLLM usage: https://huggingface.co/nvidia/NVIDIA-Nemotron-Nano-9B-v2
  VLLM_ARGS+=(--mamba_ssm_cache_dtype "$MAMBA_SSM_CACHE_DTYPE")
fi

python3 -m vllm.entrypoints.openai.api_server \
  "${VLLM_ARGS[@]}"
