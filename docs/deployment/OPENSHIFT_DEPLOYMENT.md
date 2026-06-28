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
AI_MODEL_MODE=gb10-openai
OPENAI_API_KEY=<cloud-vision-key>
GB10_OPENAI_BASE_URL=https://<cloudflare-tunnel-host>/v1
GB10_OPENAI_API_KEY=<gb10-token-if-enabled>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<browser-map-key>
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=<optional-map-id>
```

Notes:

- `OPENAI_API_KEY` is used for cloud vision/high-accuracy tasks.
- `AI_MODEL_MODE=gb10-openai` routes text reasoning to the GB10 OpenAI-compatible endpoint and vision tasks to OpenAI.
- GB10 should serve the model as `gb10-local-text`; this is fixed in the app and not configured through env.
- `AI_MODEL_MODE=openai` routes both text and vision tasks to OpenAI.
- `AI_MODEL_MODE=codex` is for laptop development with Codex CLI, not the deployed OpenShift path.
- The OpenShift platform does not provide GPUs for hosted LLMs. Do not try to run the GB10 model container inside OpenShift.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is browser-exposed. Restrict it by referrer/domain in Google Cloud.

## Deploy to OpenShift

Log in to Harbor in the browser first, then copy your CLI secret from User Profile.

```bash
docker login https://ihl-harbor.apps.innovate.sg-aie.com/
```

Deploy with one script:

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

The script:

- reads `.env` when present
- prompts for missing runtime secrets without writing them to files
- patch-bumps `package.json` and `package-lock.json`
- builds and pushes the image to Harbor
- deploys the image to OpenShift
- creates/updates `firstsight-runtime`
- creates/updates deployment `firstsight` and container `1stsight`
- exposes port `8080` with edge TLS route redirect
- runs route smoke checks
- prints recent pod logs

The deployed image is:

```text
ihl-harbor.apps.innovate.sg-aie.com/adore/1stsight:<package-version>
```

Defaults:

- Team/project: `adore`
- Image name: `1stsight`
- Image tag: the SemVer `version` from `package.json`, after a patch bump
- OpenShift app/deployment/service/route: `firstsight`

To deploy without bumping the package version:

```bash
./scripts/deploy.sh --no-bump
```

To deploy an explicit tag:

```bash
./scripts/deploy.sh --tag 1.0.0
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
ihl-harbor.apps.innovate.sg-aie.com/adore/1stsight:<package-version>
```

Use these form settings:

- Application name: `firstsight`
- Name: `firstsight`
- Target port: `8080`
- Create route: enabled
- Runtime icon: optional

OpenShift resource names must start with a letter, so the deployment/service/route name is `firstsight`. The Harbor image name remains `1stsight`.

After creation, open the workload/deployment env settings and add the runtime env vars listed above. If the console supports secrets, create a secret first and reference it from the deployment.

## Verification checklist

The deploy script already runs these smoke checks. To verify manually:

```bash
APP_URL=https://firstsight-adore.apps.innovate.sg-aie.com
curl -I "$APP_URL"
curl -I "$APP_URL/api/public-config"
curl -I "$APP_URL/api/gb10/health"
curl -I "$APP_URL/videos/fire/fire-feed-a.mp4"
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
oc get deploy/firstsight
oc get svc/firstsight
oc get route/firstsight
oc logs deploy/firstsight --tail=100
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
ihl-harbor.apps.innovate.sg-aie.com/adore/1stsight:<tag>
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
oc delete route firstsight --ignore-not-found
oc delete svc firstsight --ignore-not-found
oc delete deploy firstsight --ignore-not-found
oc delete secret firstsight-runtime --ignore-not-found
```
