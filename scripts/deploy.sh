#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf 'Usage: %s [--no-bump] [--skip-build] [--skip-smoke] [--tag <tag>]\n' "${0##*/}"
  printf '\n'
  printf 'Builds, pushes, deploys, and smokes 1stSight on OpenShift.\n'
  printf '\n'
  printf 'Defaults:\n'
  printf '  Team/project: adore\n'
  printf '  Image: ihl-harbor.apps.innovate.sg-aie.com/adore/1stsight:<package-version>\n'
  printf '  App: firstsight\n'
  printf '  Version: patch-bumped in package.json and package-lock.json\n'
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

prompt_secret() {
  local name="$1"
  local value="${!name:-}"

  if [ -z "$value" ]; then
    printf '%s: ' "$name" >&2
    stty -echo
    IFS= read -r value
    stty echo
    printf '\n' >&2
    printf -v "$name" '%s' "$value"
  fi
}

prompt_value() {
  local name="$1"
  local default_value="$2"
  local value="${!name:-}"

  if [ -z "$value" ]; then
    printf '%s [%s]: ' "$name" "$default_value" >&2
    IFS= read -r value
    printf -v "$name" '%s' "${value:-$default_value}"
  fi
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

BUMP_VERSION=1
SKIP_BUILD=0
SKIP_SMOKE=0

load_dotenv

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

REGISTRY="${REGISTRY:-ihl-harbor.apps.innovate.sg-aie.com}"
TEAM_NAME="${TEAM_NAME:-adore}"
APP_NAME="${APP_NAME:-firstsight}"
IMAGE_NAME="${IMAGE_NAME:-1stsight}"
CONTAINER_NAME="${CONTAINER_NAME:-$IMAGE_NAME}"
SECRET_NAME="${SECRET_NAME:-firstsight-runtime}"

if [ -z "${IMAGE_TAG:-}" ]; then
  if [ "$BUMP_VERSION" = "1" ]; then
    IMAGE_TAG="$(bump_patch_version)"
  else
    IMAGE_TAG="$(node -p "require('./package.json').version")"
  fi
fi

IMAGE="${REGISTRY}/${TEAM_NAME}/${IMAGE_NAME}:${IMAGE_TAG}"

prompt_value AI_MODEL_MODE "gb10-openai"
prompt_value GB10_OPENAI_BASE_URL "https://gb10.adoreblvnk.com/v1"
prompt_secret OPENAI_API_KEY
prompt_secret GB10_OPENAI_API_KEY
prompt_secret NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

printf 'Deploying image: %s\n' "$IMAGE"

if [ "$SKIP_BUILD" = "0" ]; then
  printf 'Building %s\n' "$IMAGE"
  docker build -t "$IMAGE" .

  printf 'Pushing %s\n' "$IMAGE"
  docker push "$IMAGE"
fi

oc create secret generic "$SECRET_NAME" \
  --from-literal=AI_MODEL_MODE="$AI_MODEL_MODE" \
  --from-literal=OPENAI_API_KEY="$OPENAI_API_KEY" \
  --from-literal=GB10_OPENAI_BASE_URL="$GB10_OPENAI_BASE_URL" \
  --from-literal=GB10_OPENAI_API_KEY="$GB10_OPENAI_API_KEY" \
  --from-literal=NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" \
  --from-literal=NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID="${NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID:-}" \
  --dry-run=client -o yaml | oc apply -f -

if oc get deploy "$APP_NAME" >/dev/null 2>&1; then
  current_image=$(oc get deploy "$APP_NAME" -o jsonpath='{.spec.template.spec.containers[0].image}')

  if [ "$current_image" = "$IMAGE" ]; then
    printf 'Warning: %s is already the deployment image. Use a new tag if you expect changed bytes.\n' "$IMAGE" >&2
  fi

  oc set image "deployment/${APP_NAME}" "${CONTAINER_NAME}=${IMAGE}"
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

oc patch route "$APP_NAME" --type=merge -p '{"spec":{"tls":{"termination":"edge","insecureEdgeTerminationPolicy":"Redirect"}}}' >/dev/null
oc rollout status "deployment/${APP_NAME}" --timeout=180s

APP_URL="$(oc get route "$APP_NAME" -o jsonpath='https://{.spec.host}')"
printf 'Route: %s\n' "$APP_URL"

if [ "$SKIP_SMOKE" = "0" ]; then
  APP_URL="${APP_URL%/}"
  smoke_check GET / 200
  smoke_check GET /api/public-config 200
  smoke_check GET /api/gb10/health 200
  smoke_check GET /videos/fire/fire-feed-a.mp4 200

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
fi

oc logs "deployment/${APP_NAME}" --tail=80
