# 1stSight runbook

1stSight runs as a Next.js app on the laptop or OpenShift. The GB10 only hosts the local text model endpoint.

Current local setup:

- Laptop / WSL app: Next.js development server.
- GB10 target: `user1@192.168.0.102`.
- GB10 model API: `http://192.168.0.102:8000/v1`.
- GB10 served model: `gb10-local-text`.
- GB10 model image: `nvcr.io/nvidia/vllm:26.05.post1-py3`.
- GB10 model: `nvidia/NVIDIA-Nemotron-Nano-9B-v2`.

Do not commit passwords, API keys, or real `.env*` files. `.env` is ignored by Git.

## Laptop install

Run these from the repo root on the laptop / WSL:

```bash
npm ci
```

Install system `ffmpeg` if it is missing:

```bash
ffmpeg -version
```

Create or update `.env` locally:

```bash
AI_MODEL_MODE=gb10-openai
GB10_OPENAI_BASE_URL=http://192.168.0.102:8000/v1
GB10_OPENAI_API_KEY=local-dev-token
OPENAI_API_KEY=<cloud-vision-key-if-needed>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<browser-map-key>
```

Shell scripts do not automatically load `.env`; pass the needed variables inline or export them before running a script.

`npm run dev` loads `.env`, checks the configured AI endpoints once, then starts Next.js. Look for `[dev-health] gb10 alive` in the startup logs.

## AI model modes

`AI_MODEL_MODE` controls the server-side model routing:

- `gb10-openai`: text tasks use GB10; vision tasks use `OPENAI_API_KEY`. This is the default.
- `codex`: text and vision tasks use `ai-sdk-provider-codex-cli`. Run `codex login` first.
- `openai`: text and vision tasks use `OPENAI_API_KEY`.

The app uses fixed model defaults: GB10 serves `gb10-local-text`, and OpenAI/Codex calls use `gpt-5.5`.

Use GB10 plus OpenAI:

```bash
AI_MODEL_MODE=gb10-openai
GB10_OPENAI_BASE_URL=http://192.168.0.102:8000/v1
GB10_OPENAI_API_KEY=local-dev-token
OPENAI_API_KEY=<cloud-vision-key>
```

Use Codex provider for all model calls:

```bash
AI_MODEL_MODE=codex
```

Use OpenAI for all model calls:

```bash
AI_MODEL_MODE=openai
OPENAI_API_KEY=<cloud-key>
```

## Laptop start

Start the Next.js app from the repo root:

```bash
npm run dev
```

Open the local URL printed by Next.js, usually:

```text
http://localhost:3000
```

Useful stage routes:

```text
http://localhost:3000/map?incident=punggol-residential-fire
http://localhost:3000/live?incident=punggol-residential-fire
http://localhost:3000/review?incident=punggol-residential-fire
```

## Laptop stop

Stop the dev server with `Ctrl-C` in the terminal running `npm run dev`.

If a stale dev server is still holding port `3000`:

```bash
lsof -ti :3000 | xargs -r kill
```

## GB10 install

Check SSH access from the laptop / WSL:

```bash
ssh user1@192.168.0.102
```

Pull the validated ARM64 vLLM image if it is missing:

```bash
ssh user1@192.168.0.102 'docker pull --platform linux/arm64 nvcr.io/nvidia/vllm:26.05.post1-py3'
```

Check that the image exists:

```bash
ssh user1@192.168.0.102 'docker image ls nvcr.io/nvidia/vllm'
```

## GB10 start

If the `gb10-vllm` container already exists, start it from the laptop / WSL:

```bash
ssh user1@192.168.0.102 'docker start gb10-vllm'
```

If the container must be recreated, run this from the laptop / WSL:

```bash
ssh user1@192.168.0.102 'set -euo pipefail
mkdir -p "$HOME/.cache/huggingface"
docker rm -f gb10-vllm >/dev/null 2>&1 || true
docker run -d \
  --name gb10-vllm \
  --gpus all \
  --ipc=host \
  --ulimit memlock=-1 \
  --ulimit stack=67108864 \
  -p 8000:8000 \
  -v "$HOME/.cache/huggingface:/root/.cache/huggingface" \
  nvcr.io/nvidia/vllm:26.05.post1-py3 \
  python3 -m vllm.entrypoints.openai.api_server \
    --model nvidia/NVIDIA-Nemotron-Nano-9B-v2 \
    --served-model-name gb10-local-text \
    --host 0.0.0.0 \
    --port 8000 \
    --api-key local-dev-token \
    --trust-remote-code \
    --max-num-seqs 64 \
    --max-model-len 8192 \
    --mamba_ssm_cache_dtype float32'
```

If the 1stSight repo is also checked out on the GB10, use the flat helper to start vLLM and Cloudflare Tunnel together:

```bash
chmod +x scripts/gb10-run.sh
export GB10_OPENAI_API_KEY=local-dev-token
cloudflared tunnel login
cloudflared tunnel token gb10
./scripts/gb10-run.sh
```

The currently validated running container is named `gb10-vllm`.

## GB10 status

Run these on the GB10, or prefix them with `ssh user1@192.168.0.102` from the laptop / WSL.

Check the container:

```bash
docker ps --filter name=gb10-vllm
```

Watch logs:

```bash
./scripts/gb10-run.sh --logs
```

Check GPU use:

```bash
nvidia-smi
```

Check the model endpoint from the laptop / WSL:

```bash
curl -H "Authorization: Bearer local-dev-token" http://192.168.0.102:8000/v1/models
```

Run the repo smoke test from the laptop / WSL:

```bash
GB10_OPENAI_BASE_URL=http://192.168.0.102:8000/v1 \
GB10_OPENAI_API_KEY=local-dev-token \
./scripts/gb10-smoke.sh
```

Expected smoke result includes `gb10 ok`.

## GB10 stop

Run these on the GB10, or prefix them with `ssh user1@192.168.0.102` from the laptop / WSL.

Stop the model server and Cloudflare Tunnel:

```bash
./scripts/gb10-run.sh --stop
```

Do not remove the vLLM image or Hugging Face cache before the demo unless disk space requires it. Keeping them avoids another long first-run download.

## Full checks

Run local checks before a demo or deployment:

```bash
npx tsc --noEmit
npm run lint
```

Run the production build check:

```bash
npm run build
```

## More docs

- `docs/deployment/GB10_MODEL_HARNESS.md`
- `docs/deployment/OPENSHIFT_DEPLOYMENT.md`
- `PROJECT_CONTEXT.md`
