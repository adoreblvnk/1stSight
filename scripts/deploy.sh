#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf 'Usage: %s [--no-bump] [--skip-build] [--skip-smoke] [--tag <tag>]\n' "${0##*/}"
  printf '\n'
  printf 'Builds, pushes, deploys, and smokes 1stSight on OpenShift.\n'
  printf 'Loads .env first; existing shell env values override .env.\n'
  printf '\n'
  printf 'Required env or .env values:\n'
  env_example_lines
  printf '\n'
  printf 'The deploy fails if any required value is missing, blank, or still a placeholder.\n'
  printf '\n'
  printf 'Image: <REGISTRY>/<TEAM_NAME>/<IMAGE_NAME>:<package-version>\n'
  printf 'Version: patch-bumped in package.json and package-lock.json\n'
}

load_dotenv() {
  [ -f .env ] || return 0

  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ""|\#*) continue ;; esac

    local key="${line%%=*}"
    local value="${line#*=}"

    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    [ -z "${!key+x}" ] || continue

    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi

    printf -v "$key" '%s' "$value"
  done < .env
}

env_example_keys() {
  if [ ! -f .env.example ]; then
    echo ".env.example not found." >&2
    exit 1
  fi

  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ""|\#*) continue ;; esac

    local key="${line%%=*}"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    printf '%s\n' "$key"
  done < .env.example
}

env_example_lines() {
  if [ ! -f .env.example ]; then
    echo ".env.example not found." >&2
    exit 1
  fi

  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ""|\#*) continue ;; esac

    local key="${line%%=*}"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    printf '  %s\n' "$line"
  done < .env.example
}

require_env_from_example() {
  local key
  local missing=0
  local value

  while IFS= read -r key; do
    value="${!key:-}"
    if [ -z "$value" ] || [[ "$value" == \<* && "$value" == *\> ]]; then
      printf 'Missing required env: %s (set a real value in .env or shell; see .env.example)\n' "$key" >&2
      missing=1
    fi
  done < <(env_example_keys)

  if [ "$missing" = "1" ]; then
    exit 1
  fi
}

add_secret_literal() {
  local name="$1"
  SECRET_ARGS+=(--from-literal="$name=${!name}")
}

bump_patch_version() {
  node <<'NODE'
const fs = require("fs");

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

const pkg = readJson("package.json");
const match = String(pkg.version).match(/^(\d+)\.(\d+)\.(\d+)$/);

if (!match) {
  throw new Error(`Cannot patch-bump non-SemVer package version: ${pkg.version}`);
}

const nextVersion = `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
pkg.version = nextVersion;
writeJson("package.json", pkg);

if (fs.existsSync("package-lock.json")) {
  const lock = readJson("package-lock.json");
  lock.version = nextVersion;

  if (lock.packages?.[""]) {
    lock.packages[""].version = nextVersion;
  }

  writeJson("package-lock.json", lock);
}

console.log(nextVersion);
NODE
}

smoke_check() {
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

smoke_live_analysis() {
  local label="$1"
  local payload="$2"
  local output_path="$3"
  local status
  local time_total
  local content_type
  local curl_result

  curl_result=$(curl -sS -o "$output_path" -w '%{http_code} %{time_total} %{content_type}' \
    -X POST "$APP_URL/api/live/analyze" \
    -H 'Content-Type: application/json' \
    --data "$payload")
  status="${curl_result%% *}"
  curl_result="${curl_result#* }"
  time_total="${curl_result%% *}"
  content_type="${curl_result#* }"

  printf 'POST /api/live/analyze (%s) -> %s in %ss [%s]\n' "$label" "$status" "$time_total" "$content_type"

  case "$status" in
    2*) ;;
    *)
      printf 'Unexpected live analysis response body preview:\n' >&2
      head -c 800 "$output_path" >&2 || true
      printf '\n' >&2
      exit 1
      ;;
  esac
}

BUMP_VERSION=1
SKIP_BUILD=0
SKIP_SMOKE=0

load_dotenv

OPENSHIFT_CPU_LIMIT="${OPENSHIFT_CPU_LIMIT:-1200m}"
OPENSHIFT_MEMORY_LIMIT="${OPENSHIFT_MEMORY_LIMIT:-3800Mi}"
OPENSHIFT_CPU_REQUEST="${OPENSHIFT_CPU_REQUEST:-300m}"
OPENSHIFT_MEMORY_REQUEST="${OPENSHIFT_MEMORY_REQUEST:-1500Mi}"
OPENSHIFT_ROUTE_TIMEOUT="${OPENSHIFT_ROUTE_TIMEOUT:-120s}"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --help|-h)
      usage
      exit 0
      ;;
    --no-bump)
      BUMP_VERSION=0
      shift
      ;;
    --skip-build)
      SKIP_BUILD=1
      BUMP_VERSION=0
      shift
      ;;
    --skip-smoke)
      SKIP_SMOKE=1
      shift
      ;;
    --tag)
      IMAGE_TAG="${2:?Missing value for --tag}"
      BUMP_VERSION=0
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "docker command not found." >&2
  exit 1
fi

if ! command -v oc >/dev/null 2>&1; then
  echo "oc command not found. Install the OpenShift CLI or use the console guide." >&2
  exit 1
fi

require_env_from_example

if [ -z "${IMAGE_TAG:-}" ]; then
  if [ "$BUMP_VERSION" = "1" ]; then
    IMAGE_TAG="$(bump_patch_version)"
  else
    IMAGE_TAG="$(node -p "require('./package.json').version")"
  fi
fi

IMAGE="${REGISTRY}/${TEAM_NAME}/${IMAGE_NAME}:${IMAGE_TAG}"

printf 'Deploying image: %s\n' "$IMAGE"

if [ "$SKIP_BUILD" = "0" ]; then
  printf 'Building %s\n' "$IMAGE"
  docker build -t "$IMAGE" .

  printf 'Pushing %s\n' "$IMAGE"
  docker push "$IMAGE"
fi

SECRET_ARGS=(create secret generic "$SECRET_NAME")
add_secret_literal AI_MODEL_MODE
add_secret_literal GB10_OPENAI_API_KEY
add_secret_literal GB10_OPENAI_BASE_URL
add_secret_literal NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
add_secret_literal NEXT_PUBLIC_WEBRTC_ICE_TRANSPORT_POLICY
add_secret_literal NEXT_PUBLIC_WEBRTC_TURN_CREDENTIAL
add_secret_literal NEXT_PUBLIC_WEBRTC_TURN_URLS
add_secret_literal NEXT_PUBLIC_WEBRTC_TURN_USERNAME
add_secret_literal OPENAI_API_KEY

oc "${SECRET_ARGS[@]}" --dry-run=client -o yaml | oc apply -f -

if oc get deploy "$APP_NAME" >/dev/null 2>&1; then
  oc patch "deployment/${APP_NAME}" --type=merge -p '{"spec":{"strategy":{"type":"RollingUpdate","rollingUpdate":{"maxSurge":0,"maxUnavailable":1}}}}'
  current_image=$(oc get deploy "$APP_NAME" -o jsonpath='{.spec.template.spec.containers[0].image}')

  if [ "$current_image" = "$IMAGE" ]; then
    printf 'Warning: %s is already the deployment image. Use a new tag if you expect changed bytes.\n' "$IMAGE" >&2
  fi

  oc set image "deployment/${APP_NAME}" "${CONTAINER_NAME}=${IMAGE}"
else
  oc create deployment "$APP_NAME" --image="$IMAGE"
  oc patch "deployment/${APP_NAME}" --type=merge -p '{"spec":{"strategy":{"type":"RollingUpdate","rollingUpdate":{"maxSurge":0,"maxUnavailable":1}}}}'
fi

oc set env "deployment/${APP_NAME}" --from="secret/${SECRET_NAME}"
oc set env "deployment/${APP_NAME}" PORT=8080 HOSTNAME=0.0.0.0 NODE_ENV=production
# OpenShift CLI set resources: https://github.com/openshift/openshift-docs/blob/main/modules/oc-by-example-content.adoc
oc set resources "deployment/${APP_NAME}" -c="$CONTAINER_NAME" \
  --limits="cpu=${OPENSHIFT_CPU_LIMIT},memory=${OPENSHIFT_MEMORY_LIMIT}" \
  --requests="cpu=${OPENSHIFT_CPU_REQUEST},memory=${OPENSHIFT_MEMORY_REQUEST}"

if oc get svc "$APP_NAME" >/dev/null 2>&1; then
  oc patch svc "$APP_NAME" --type='json' -p='[{"op":"replace","path":"/spec/ports/0/port","value":8080},{"op":"replace","path":"/spec/ports/0/targetPort","value":8080}]' >/dev/null || true
else
  oc expose deploy "$APP_NAME" --port=8080 --target-port=8080
fi

if ! oc get route "$APP_NAME" >/dev/null 2>&1; then
  oc expose svc "$APP_NAME"
fi

oc patch route "$APP_NAME" --type=merge -p '{"spec":{"tls":{"termination":"edge","insecureEdgeTerminationPolicy":"Redirect"}}}' >/dev/null
# OpenShift route timeout annotation: https://github.com/openshift/openshift-docs/blob/main/modules/nw-configuring-route-timeouts.adoc
oc annotate route "$APP_NAME" --overwrite "haproxy.router.openshift.io/timeout=${OPENSHIFT_ROUTE_TIMEOUT}"
oc rollout status "deployment/${APP_NAME}" --timeout=180s

APP_URL="$(oc get route "$APP_NAME" -o jsonpath='https://{.spec.host}')"
printf 'Route: %s\n' "$APP_URL"

if [ "$SKIP_SMOKE" = "0" ]; then
  APP_URL="${APP_URL%/}"
  smoke_check GET / 200
  smoke_check GET /api/public-config 200
  smoke_check GET /api/gb10/health 200
  smoke_check GET /videos/fire/fire-feed-a.mp4 200

  smoke_live_analysis "fire startup" \
    '{"incidentId":"punggol-residential-fire","feeds":[{"responderId":"ff-a","videoSrc":"/videos/fire/fire-feed-a.mp4","currentTime":1}],"operatorEvidenceSupport":true}' \
    /tmp/1stsight-smoke-live-fire.out
  smoke_live_analysis "post-fire responder safety" \
    '{"incidentId":"punggol-residential-fire","feeds":[{"responderId":"ff-a","videoSrc":"/videos/fire/punggol-post-fire-wei-jie-pov.mp4","currentTime":38},{"responderId":"ff-b","videoSrc":"/videos/fire/punggol-post-fire-hafiz-pov.mp4","currentTime":38}],"operatorEvidenceSupport":true}' \
    /tmp/1stsight-smoke-live-post-fire.out

  printf 'Smoke route completed for %s\n' "$APP_URL"
fi

oc logs "deployment/${APP_NAME}" --tail=80
