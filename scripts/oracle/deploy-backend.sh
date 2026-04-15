#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

APP_IMAGE="${APP_IMAGE:-aero-backend}"
APP_CONTAINER="${APP_CONTAINER:-aero-backend}"
HOST_PORT="${HOST_PORT:-8000}"
CONTAINER_PORT="${CONTAINER_PORT:-8000}"
DOCKER_BUILD_ARGS="${DOCKER_BUILD_ARGS:-}"

docker_cmd() {
    if docker info >/dev/null 2>&1; then
        docker "$@"
    else
        sudo docker "$@"
    fi
}

docker_prefix() {
    if docker info >/dev/null 2>&1; then
        echo "docker"
    else
        echo "sudo docker"
    fi
}

if ! command -v curl >/dev/null 2>&1; then
    echo "curl is required. Run scripts/oracle/install-host.sh first."
    exit 1
fi

cd "$REPO_ROOT"

# Ensure backend/.env exists
if [[ ! -f backend/.env ]]; then
    if [[ -f backend/.env.example ]]; then
        echo "Creating backend/.env from .env.example..."
        cp backend/.env.example backend/.env
        echo "NOTE: Edit backend/.env to set CORS_ORIGINS for production."
    else
        echo "Creating minimal backend/.env..."
        printf 'PORT=8000\nCORS_ORIGINS=\n' > backend/.env
    fi
fi

echo "Building Docker image '${APP_IMAGE}' (backend only)..."
if [[ -n "$DOCKER_BUILD_ARGS" ]]; then
    # shellcheck disable=SC2086
    docker_cmd build $DOCKER_BUILD_ARGS -f backend/Dockerfile -t "$APP_IMAGE" .
else
    docker_cmd build -f backend/Dockerfile -t "$APP_IMAGE" .
fi

if docker_cmd ps -a --format '{{.Names}}' | grep -Fxq "$APP_CONTAINER"; then
    echo "Removing existing container '${APP_CONTAINER}'..."
    docker_cmd rm -f "$APP_CONTAINER" >/dev/null
fi

echo "Starting container '${APP_CONTAINER}' on port ${HOST_PORT}..."
docker_cmd run -d \
    --restart unless-stopped \
    --name "$APP_CONTAINER" \
    --env-file backend/.env \
    -e PYTHONUNBUFFERED=1 \
    -e PORT="${CONTAINER_PORT}" \
    -p "${HOST_PORT}:${CONTAINER_PORT}" \
    "$APP_IMAGE" >/dev/null

health_url="http://127.0.0.1:${HOST_PORT}/api/health"
echo "Waiting for API health check at ${health_url}..."
curl --retry 20 --retry-delay 3 --retry-connrefused --retry-all-errors -fsS "$health_url" >/dev/null

echo ""
echo "Backend deployment complete."
echo "Health:   ${health_url}"
echo "API docs: http://127.0.0.1:${HOST_PORT}/docs"
echo "Logs:     $(docker_prefix) logs -f ${APP_CONTAINER}"
