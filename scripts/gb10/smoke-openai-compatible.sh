#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${GB10_OPENAI_BASE_URL:-${BASE_URL:-http://localhost:8000/v1}}"
MODEL_ID="${MODEL_ID:-gb10-local-text}"
API_KEY="${GB10_OPENAI_API_KEY:-${API_KEY:-local-dev-token}}"

# NVIDIA Nemotron Nano prompt format: https://huggingface.co/nvidia/NVIDIA-Nemotron-Nano-9B-v2
REQUEST_BODY=$(printf '{"model":"%s","messages":[{"role":"system","content":"/no_think\\nReply with exactly: gb10 ok"},{"role":"user","content":"health check"}],"temperature":0,"max_tokens":32}' "$MODEL_ID")
CURL_ARGS=(-sS "${BASE_URL%/}/chat/completions" -H "Content-Type: application/json" --data "$REQUEST_BODY")

if [ -n "$API_KEY" ]; then
  CURL_ARGS+=(--oauth2-bearer "$API_KEY")
fi

# OpenAI Chat Completions API: https://platform.openai.com/docs/api-reference/chat/create
curl "${CURL_ARGS[@]}"
echo
