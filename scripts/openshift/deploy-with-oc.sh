#!/usr/bin/env bash
set -euo pipefail

# OpenShift image deployment flow: resources/SCDF Challenge OpenShift Deployment Guide.md
APP_NAME="${APP_NAME:-1stsight}"
REGISTRY="${REGISTRY:-ihl-harbor.apps.innovate.sg-aie.com}"
TEAM_NAME="${TEAM_NAME:?Set TEAM_NAME to your OpenShift/Harbor project name}"
IMAGE_NAME="${IMAGE_NAME:-1stsight}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"
IMAGE="${REGISTRY}/${TEAM_NAME}/${IMAGE_NAME}:${IMAGE_TAG}"
SECRET_NAME="${SECRET_NAME:-1stsight-runtime}"

if ! command -v oc >/dev/null 2>&1; then
  echo "oc command not found. Install the OpenShift CLI or use the console guide." >&2
  exit 1
fi

oc create secret generic "$SECRET_NAME" \
  --from-literal=OPENAI_API_KEY="${OPENAI_API_KEY:-}" \
  --from-literal=GB10_OPENAI_BASE_URL="${GB10_OPENAI_BASE_URL:-}" \
  --from-literal=GB10_MODEL_ID="${GB10_MODEL_ID:-}" \
  --from-literal=GB10_OPENAI_API_KEY="${GB10_OPENAI_API_KEY:-}" \
  --from-literal=NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:-}" \
  --from-literal=NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID="${NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID:-}" \
  --dry-run=client -o yaml | oc apply -f -

if oc get deploy "$APP_NAME" >/dev/null 2>&1; then
  oc set image "deployment/${APP_NAME}" "${APP_NAME}=${IMAGE}"
else
  oc create deployment "$APP_NAME" --image="$IMAGE"
fi

oc set env "deployment/${APP_NAME}" --from="secret/${SECRET_NAME}"
oc set env "deployment/${APP_NAME}" PORT=8080 HOSTNAME=0.0.0.0 NODE_ENV=production

if oc get svc "$APP_NAME" >/dev/null 2>&1; then
  oc patch svc "$APP_NAME" --type='json' -p='[{"op":"replace","path":"/spec/ports/0/port","value":8080},{"op":"replace","path":"/spec/ports/0/targetPort","value":8080}]' >/dev/null || true
else
  oc expose deploy "$APP_NAME" --port=8080 --target-port=8080
fi

if ! oc get route "$APP_NAME" >/dev/null 2>&1; then
  oc expose svc "$APP_NAME"
fi

oc rollout status "deployment/${APP_NAME}" --timeout=180s
oc get route "$APP_NAME" -o jsonpath='https://{.spec.host}{"\n"}'
