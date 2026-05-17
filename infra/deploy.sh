#!/usr/bin/env bash
# Deploy Feera to the Hetzner Falkenstein DE box (46.225.157.75).
# Usage: ./deploy.sh <git-sha>
# Assumes images are already published to GHCR by CI.

set -euo pipefail

IMAGE_TAG="${1:-${GITHUB_SHA:-}}"
if [ -z "${IMAGE_TAG}" ]; then
  echo "Usage: $0 <git-sha>"
  exit 1
fi

DEPLOY_HOST="${DEPLOY_SSH_HOST:-46.225.157.75}"
DEPLOY_USER="${DEPLOY_SSH_USER:-root}"
DEPLOY_PATH="/srv/feera"

echo "==> Pushing infra files to ${DEPLOY_USER}@${DEPLOY_HOST}"
rsync -avz --delete \
  --exclude='.env.production' \
  ./infra/ \
  "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"

echo "==> Running migrations (Drizzle against Neon)"
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" \
  "cd ${DEPLOY_PATH} && docker run --rm --env-file .env.production \
   ghcr.io/feerasta-ai/feera-workers:${IMAGE_TAG} \
   pnpm --filter @feera/db db:migrate"

echo "==> Bringing up stack at tag ${IMAGE_TAG}"
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" \
  "cd ${DEPLOY_PATH} && IMAGE_TAG=${IMAGE_TAG} docker compose pull && \
   IMAGE_TAG=${IMAGE_TAG} docker compose up -d --remove-orphans"

echo "==> Health check"
sleep 5
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" \
  "curl -fsSL https://feera.ai/api/health" \
  && echo "==> OK" \
  || { echo "==> Health check FAILED"; exit 2; }

echo "==> Deploy ${IMAGE_TAG} complete."
