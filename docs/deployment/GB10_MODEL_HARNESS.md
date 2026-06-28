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

### Start vLLM and Cloudflare Tunnel

Use the flat GB10 helper on GB10 / NVIDIA DGX Spark. It starts the NVIDIA NGC vLLM container and `cloudflared`.

```bash
chmod +x scripts/gb10-run.sh
export GB10_OPENAI_API_KEY=local-dev-token
export CLOUDFLARED_TOKEN=<cloudflare-tunnel-token>
./scripts/gb10-run.sh
```

The app env then becomes:

```bash
GB10_OPENAI_BASE_URL=https://gb10.adoreblvnk.com/v1
GB10_OPENAI_API_KEY=local-dev-token
AI_MODEL_MODE=gb10-openai
```

Useful GB10 commands:

```bash
./scripts/gb10-run.sh --logs
./scripts/gb10-run.sh --stop
```

## Smoke tests

Run the OpenAI-compatible smoke test from your laptop or from inside the OpenShift pod network:

```bash
chmod +x scripts/gb10-smoke.sh
GB10_OPENAI_BASE_URL=https://gb10.adoreblvnk.com/v1 \
GB10_OPENAI_API_KEY=local-dev-token \
./scripts/gb10-smoke.sh
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
- Slow first response: model load/cold start. Warm it with `scripts/gb10-smoke.sh` before the demo.
- OpenShift cannot reach the GB10 LAN IP: use Cloudflare Tunnel or another approved HTTPS tunnel.
- Structured output failures: use a stronger instruction-tuned model or fall back to cloud text reasoning for the demo.
