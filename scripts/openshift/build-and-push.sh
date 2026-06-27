#!/usr/bin/env bash
set -euo pipefail

# SCDF OpenShift guide registry format: resources/SCDF Challenge OpenShift Deployment Guide.md
REGISTRY="${REGISTRY:-ihl-harbor.apps.innovate.sg-aie.com}"
TEAM_NAME="${TEAM_NAME:?Set TEAM_NAME to your Harbor/OpenShift project name}"
IMAGE_NAME="${IMAGE_NAME:-1stsight}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"
IMAGE="${REGISTRY}/${TEAM_NAME}/${IMAGE_NAME}:${IMAGE_TAG}"

printf 'Building %s\n' "$IMAGE"
docker build -t "$IMAGE" .

printf 'Pushing %s\n' "$IMAGE"
docker push "$IMAGE"

printf 'Image pushed: %s\n' "$IMAGE"
