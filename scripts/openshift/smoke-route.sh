#!/usr/bin/env bash
set -euo pipefail

APP_URL="${1:-${APP_URL:-}}"
if [ -z "$APP_URL" ]; then
  echo "Usage: $0 https://<openshift-route-host>" >&2
  exit 1
fi

APP_URL="${APP_URL%/}"

check() {
  local method="$1"
  local path="$2"
  local expected="$3"
  local status
  status=$(curl -sS -o /tmp/1stsight-smoke.out -w '%{http_code}' -X "$method" "$APP_URL$path")
  printf '%s %s -> %s\n' "$method" "$path" "$status"
  if [ "$status" != "$expected" ]; then
    printf 'Unexpected response body preview:\n' >&2
    head -c 500 /tmp/1stsight-smoke.out >&2 || true
    printf '\n' >&2
    exit 1
  fi
}

check GET / 200
check GET /api/public-config 200
check GET /videos/fire/fire-feed-a.mp4 200

status=$(curl -sS -o /tmp/1stsight-smoke-live.out -w '%{http_code}' \
  -X POST "$APP_URL/api/live/analyze" \
  -H 'Content-Type: application/json' \
  --data '{"incidentId":"punggol-residential-fire","feeds":[{"responderId":"ff-a","videoSrc":"/videos/fire/fire-feed-a.mp4","currentTime":1}],"operatorEvidenceSupport":true}')
printf 'POST /api/live/analyze -> %s\n' "$status"

if [ "$status" = "404" ]; then
  head -c 500 /tmp/1stsight-smoke-live.out >&2 || true
  printf '\n/api/live/analyze returned 404. The deployed image is stale or not running Next route handlers.\n' >&2
  exit 1
fi

printf 'Smoke route completed for %s\n' "$APP_URL"
