# OpenShift deployment guide for 1stSight

This guide adapts `resources/SCDF Challenge OpenShift Deployment Guide.md` for 1stSight.

Official platform URLs from the organiser guide:

- OpenShift console: `https://console-openshift-console.apps.innovate.sg-aie.com/`
- Harbor registry: `https://ihl-harbor.apps.innovate.sg-aie.com/`
- Sign-in method: Keycloak

1stSight is already container-ready:

- `Dockerfile` builds the Next.js standalone output.
- The runtime image installs `ffmpeg` for frame extraction.
- The container sets `PORT=8080` and exposes `8080`.
- Public videos are copied into the image through `COPY --from=builder /app/public ./public`.

## Required local tools

- Docker Desktop or Docker Engine
- Git
- Access to the OpenShift console
- Access to the Harbor project named after your team
- Optional but useful: `oc` CLI

## Required runtime configuration

Set these on the OpenShift deployment as secrets/env vars. Do not commit real values.

```bash
OPENAI_API_KEY=<cloud-vision-key>
GB10_OPENAI_BASE_URL=https://<cloudflare-tunnel-host>/v1
GB10_MODEL_ID=<served-gb10-model-id>
GB10_OPENAI_API_KEY=<gb10-token-if-enabled>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<browser-map-key>
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=<optional-map-id>
```

Notes:

- `OPENAI_API_KEY` is used for cloud vision/high-accuracy tasks.
- `GB10_OPENAI_BASE_URL` and `GB10_MODEL_ID` route text reasoning to the GB10 OpenAI-compatible endpoint.
- The OpenShift platform does not provide GPUs for hosted LLMs. Do not try to run the GB10 model container inside OpenShift.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is browser-exposed. Restrict it by referrer/domain in Google Cloud.

## Build and push to Harbor

Log in to Harbor in the browser first, then copy your CLI secret from User Profile.

```bash
docker login https://ihl-harbor.apps.innovate.sg-aie.com/
```

Build and push using the helper script:

```bash
chmod +x scripts/openshift/build-and-push.sh
TEAM_NAME=<your-team-name> \
IMAGE_NAME=1stsight \
IMAGE_TAG=$(git rev-parse --short HEAD) \
./scripts/openshift/build-and-push.sh
```

The resulting image is:

```text
ihl-harbor.apps.innovate.sg-aie.com/<your-team-name>/1stsight:<tag>
```

For a stable demo tag, use:

```bash
TEAM_NAME=<your-team-name> IMAGE_TAG=finale ./scripts/openshift/build-and-push.sh
```

## Deploy through the OpenShift console

Follow the organiser guide's console path:

- Open `https://console-openshift-console.apps.innovate.sg-aie.com/`.
- Click `keycloak` and sign in.
- Select your team project.
- Click `+Add`.
- Click `Container images`.
- Under `Image name from external registry`, enter:

```text
ihl-harbor.apps.innovate.sg-aie.com/<your-team-name>/1stsight:<tag>
```

Use these form settings:

- Application name: `1stsight`
- Name: `1stsight`
- Target port: `8080`
- Create route: enabled
- Runtime icon: optional

After creation, open the workload/deployment env settings and add the runtime env vars listed above. If the console supports secrets, create a secret first and reference it from the deployment.

## Deploy with `oc` CLI

If you have `oc` configured for your team project, use:

```bash
chmod +x scripts/openshift/deploy-with-oc.sh
TEAM_NAME=<your-team-name> \
IMAGE_TAG=finale \
OPENAI_API_KEY=<cloud-vision-key> \
GB10_OPENAI_BASE_URL=https://<cloudflare-tunnel-host>/v1 \
GB10_MODEL_ID=<served-gb10-model-id> \
GB10_OPENAI_API_KEY=<gb10-token-if-enabled> \
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<browser-map-key> \
./scripts/openshift/deploy-with-oc.sh
```

The script:

- creates/updates a secret named `1stsight-runtime`
- creates/updates the deployment named `1stsight`
- exposes port `8080`
- creates a service and route if missing
- prints the route URL

## Verification checklist

After deployment, verify the route:

```bash
APP_URL=https://<route-host>
./scripts/openshift/smoke-route.sh "$APP_URL"
```

Manual checks:

- Home page loads.
- `/map?incident=punggol-residential-fire` loads.
- `/live?incident=punggol-residential-fire` loads.
- `/review?incident=punggol-residential-fire` loads.
- `/api/public-config` returns JSON.
- `/videos/fire/fire-feed-a.mp4` returns video bytes.
- `/api/live/analyze` returns JSON, or a clear model configuration error, not a 404 HTML page.
- Browser console has no `JSON.parse unexpected character` from API 404 pages.

OpenShift checks:

```bash
oc get pods
oc get deploy/1stsight
oc get svc/1stsight
oc get route/1stsight
oc logs deploy/1stsight --tail=100
```

The app should show it is listening on port `8080`.

## Common issues

### `GET /api/public-config 404` or `POST /api/live/analyze 404`

The running container is stale, built from the wrong directory, or not a Next.js standalone server. Rebuild and redeploy the current image. Do not deploy a static export.

### `JSON.parse: unexpected character`

The frontend expected JSON but received an HTML/text error page. Check the preceding network log for a 404/500 API response.

### Image pull failure

Confirm the Harbor image path is exactly:

```text
ihl-harbor.apps.innovate.sg-aie.com/<your-team-name>/1stsight:<tag>
```

If the image is private, configure image pull credentials or deploy through the OpenShift console after validating the external registry image.

### Resource quota error

Delete unused sample deployments in the team project. The organiser guide notes that resource quota errors mean the team has hit platform limits.

### GB10 unreachable from OpenShift

OpenShift usually cannot call a booth LAN IP directly. Use the tested Cloudflare Tunnel HTTPS URL in `GB10_OPENAI_BASE_URL`, or fall back to cloud text reasoning for the stage demo.

### Videos missing

Confirm the Docker image includes `public/videos`. The current Dockerfile copies `public` into the standalone runner image.

## Cleanup

In the console, use Topology and delete the `1stsight` deployment/application if you need to free quota.

With `oc`:

```bash
oc delete route 1stsight --ignore-not-found
oc delete svc 1stsight --ignore-not-found
oc delete deploy 1stsight --ignore-not-found
oc delete secret 1stsight-runtime --ignore-not-found
```
