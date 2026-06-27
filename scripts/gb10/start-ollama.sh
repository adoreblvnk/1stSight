#!/usr/bin/env bash
set -euo pipefail

# Ollama OpenAI compatibility: https://github.com/ollama/ollama/blob/main/docs/openai.md
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5:7b-instruct}"
export OLLAMA_HOST="${OLLAMA_HOST:-0.0.0.0:11434}"

if ! command -v ollama >/dev/null 2>&1; then
  echo "ollama command not found. Install Ollama first: https://ollama.com/download" >&2
  exit 1
fi

ollama pull "$OLLAMA_MODEL"

echo "Starting Ollama on ${OLLAMA_HOST}. Use GB10_OPENAI_BASE_URL=http://<gb10-ip>:${OLLAMA_HOST##*:}/v1 and GB10_MODEL_ID=${OLLAMA_MODEL}."
ollama serve
