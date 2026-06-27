#!/usr/bin/env bash
set -euo pipefail

# NVIDIA vLLM OpenAI-compatible server: https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html
MODEL_ID="${MODEL_ID:-Qwen/Qwen2.5-7B-Instruct}"
SERVED_MODEL_NAME="${SERVED_MODEL_NAME:-gb10-local-text}"
PORT="${PORT:-8000}"
API_KEY="${GB10_OPENAI_API_KEY:-${API_KEY:-local-dev-token}}"
GPU_MEMORY_UTILIZATION="${GPU_MEMORY_UTILIZATION:-0.85}"
MAX_MODEL_LEN="${MAX_MODEL_LEN:-8192}"
MAX_NUM_SEQS="${MAX_NUM_SEQS:-64}"
MAMBA_SSM_CACHE_DTYPE="${MAMBA_SSM_CACHE_DTYPE:-float32}"
TRUST_REMOTE_CODE="${TRUST_REMOTE_CODE:-1}"
# NVIDIA vLLM NGC container: https://catalog.ngc.nvidia.com/orgs/nvidia/containers/vllm
DOCKER_IMAGE="${DOCKER_IMAGE:-nvcr.io/nvidia/vllm:26.05.post1-py3}"
DOCKER_PLATFORM="${DOCKER_PLATFORM:-}"
HF_HOME_DIR="${HF_HOME_DIR:-$HOME/.cache/huggingface}"

mkdir -p "$HF_HOME_DIR"

VLLM_ARGS=(
  --model "${MODEL_ID}"
  --served-model-name "${SERVED_MODEL_NAME}"
  --host 0.0.0.0
  --port 8000
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

DOCKER_ARGS=(
  --rm -it
  --gpus all
  --ipc=host
  --ulimit memlock=-1
  --ulimit stack=67108864
  -p "${PORT}:8000"
  -v "${HF_HOME_DIR}:/root/.cache/huggingface"
)

if [ -n "$DOCKER_PLATFORM" ]; then
  DOCKER_ARGS+=(--platform "$DOCKER_PLATFORM")
fi

docker run "${DOCKER_ARGS[@]}" \
  "${DOCKER_IMAGE}" \
  python3 -m vllm.entrypoints.openai.api_server \
  "${VLLM_ARGS[@]}"
