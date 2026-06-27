# GB10 model harness guide for 1stSight

This guide sets up a Dell GB10 / NVIDIA DGX Spark as a local model endpoint for 1stSight text reasoning. The app expects an OpenAI-compatible `/v1` API serving `gb10-local-text` through these environment variables:

```bash
GB10_OPENAI_BASE_URL=http://<gb10-host>:8000/v1
GB10_OPENAI_API_KEY=<optional-token-if-enabled>
AI_MODEL_MODE=gb10-openai
```

1stSight uses the GB10 path for text-only structured tasks when `GB10_OPENAI_BASE_URL` is set. Vision-heavy frame extraction still needs the configured cloud vision path unless you replace that part of the app.

## Recommended path: vLLM OpenAI-compatible server

Use vLLM when possible because it exposes the OpenAI-compatible shape the app already uses.

### GB10 prerequisites

- Docker with NVIDIA Container Toolkit, or a Python environment with vLLM installed.
- A model that fits the GB10 memory budget. Start smaller before moving up.
- Network access from your laptop or OpenShift route to the GB10 endpoint.
- Optional Cloudflare Tunnel if OpenShift must reach the GB10 from outside the booth LAN.

### Start vLLM with Docker

Use the NVIDIA NGC vLLM container on GB10 / NVIDIA DGX Spark. The upstream `vllm/vllm-openai` image may resolve to `linux/amd64` and fail on the GB10 `aarch64` host.

```bash
chmod +x scripts/gb10/start-vllm-docker.sh
DOCKER_IMAGE=nvcr.io/nvidia/vllm:26.05.post1-py3 \
MODEL_ID=nvidia/NVIDIA-Nemotron-Nano-9B-v2 \
SERVED_MODEL_NAME=gb10-local-text \
PORT=8000 \
GB10_OPENAI_API_KEY=local-dev-token \
MAX_MODEL_LEN=8192 \
MAX_NUM_SEQS=64 \
MAMBA_SSM_CACHE_DTYPE=float32 \
./scripts/gb10/start-vllm-docker.sh
```

The app env then becomes:

```bash
GB10_OPENAI_BASE_URL=http://<gb10-ip>:8000/v1
GB10_OPENAI_API_KEY=local-dev-token
AI_MODEL_MODE=gb10-openai
```

### Start vLLM with Python

Use this when Docker GPU setup is inconvenient but Python/CUDA is already configured.

```bash
chmod +x scripts/gb10/start-vllm-python.sh
MODEL_ID=nvidia/NVIDIA-Nemotron-Nano-9B-v2 \
SERVED_MODEL_NAME=gb10-local-text \
PORT=8000 \
GB10_OPENAI_API_KEY=local-dev-token \
MAX_MODEL_LEN=8192 \
MAX_NUM_SEQS=64 \
MAMBA_SSM_CACHE_DTYPE=float32 \
./scripts/gb10/start-vllm-python.sh
```

For laptop-to-GB10 testing on the same Wi-Fi, use the GB10 LAN IP directly. Cloudflare Tunnel is only needed when OpenShift or another external network must reach the GB10.

## Alternate path: Ollama bridge

Ollama is convenient for local experiments. Newer Ollama builds expose OpenAI-compatible endpoints under `/v1`, so 1stSight can point at it directly.

```bash
chmod +x scripts/gb10/start-ollama.sh
OLLAMA_MODEL=qwen2.5:7b-instruct \
OLLAMA_HOST=0.0.0.0:11434 \
./scripts/gb10/start-ollama.sh
```

The app env then becomes:

```bash
GB10_OPENAI_BASE_URL=http://<gb10-ip>:11434/v1
GB10_OPENAI_API_KEY=ollama
AI_MODEL_MODE=gb10-openai
```

If a model fails structured output, switch to vLLM or a stronger instruction model. Keep the same app-side env names and serve the model as `gb10-local-text`.

## Smoke tests

Run the OpenAI-compatible smoke test from your laptop or from inside the OpenShift pod network:

```bash
chmod +x scripts/gb10/smoke-openai-compatible.sh
GB10_OPENAI_BASE_URL=http://<gb10-ip>:8000/v1 \
GB10_OPENAI_API_KEY=local-dev-token \
./scripts/gb10/smoke-openai-compatible.sh
```

Expected result: JSON containing a chat completion with a short answer.

## Local 1stSight env

Create a local `.env` for development, not committed to Git:

```bash
GB10_OPENAI_BASE_URL=http://<gb10-ip>:8000/v1
GB10_OPENAI_API_KEY=local-dev-token
AI_MODEL_MODE=gb10-openai
OPENAI_API_KEY=<cloud-vision-key-if-needed>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<browser-map-key>
```

Then run:

```bash
npm run dev
```

## OpenShift deployment env

When deployed on OpenShift, store these as runtime secrets or environment variables on the deployment:

```bash
GB10_OPENAI_BASE_URL=https://<cloudflare-tunnel-host>/v1
GB10_OPENAI_API_KEY=<token-if-enabled>
AI_MODEL_MODE=gb10-openai
OPENAI_API_KEY=<cloud-vision-key-if-needed>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<browser-map-key>
```

Do not expose `OPENAI_API_KEY`, `GB10_OPENAI_BASE_URL`, or `GB10_OPENAI_API_KEY` through browser code. `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is intentionally browser-exposed and should be restricted by referrer/domain in Google Cloud.

## Troubleshooting

- `404 /v1/chat/completions`: base URL is wrong. For vLLM/Ollama the app wants the base URL ending in `/v1`.
- `401 unauthorized`: set `GB10_OPENAI_API_KEY` to the token configured by the model server, or remove endpoint auth for local-only tests.
- `model not found`: serve the endpoint model as `gb10-local-text`, not necessarily the Hugging Face repo id.
- Slow first response: model load/cold start. Warm it with `scripts/gb10/smoke-openai-compatible.sh` before the demo.
- OpenShift cannot reach the GB10 LAN IP: use Cloudflare Tunnel or another approved HTTPS tunnel.
- Structured output failures: use a stronger instruction-tuned model or fall back to cloud text reasoning for the demo.
