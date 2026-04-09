#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

APP_IMAGE="${APP_IMAGE:-aero-fullstack}"
APP_CONTAINER="${APP_CONTAINER:-aero}"
HOST_PORT="${HOST_PORT:-80}"
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

echo "Building Docker image '$APP_IMAGE'..."
if [[ -n "$DOCKER_BUILD_ARGS" ]]; then
    # shellcheck disable=SC2086
    docker_cmd build $DOCKER_BUILD_ARGS -t "$APP_IMAGE" .
else
    docker_cmd build -t "$APP_IMAGE" .
fi

if docker_cmd ps -a --format '{{.Names}}' | grep -Fxq "$APP_CONTAINER"; then
    echo "Removing existing container '$APP_CONTAINER'..."
    docker_cmd rm -f "$APP_CONTAINER" >/dev/null
fi

echo "Starting container '$APP_CONTAINER' on host port ${HOST_PORT}..."
docker_cmd run -d \
    --restart unless-stopped \
    --name "$APP_CONTAINER" \
    -p "${HOST_PORT}:${CONTAINER_PORT}" \
    "$APP_IMAGE" >/dev/null

health_url="http://127.0.0.1:${HOST_PORT}/api/health"
echo "Waiting for API health check at ${health_url}..."
curl --retry 20 --retry-delay 2 --retry-connrefused --retry-all-errors -fsS "$health_url" >/dev/null

public_suffix=""
if [[ "$HOST_PORT" != "80" ]]; then
    public_suffix=":${HOST_PORT}"
fi

echo "Deployment finished."
echo "App: http://<your-public-ip>${public_suffix}/"
echo "API docs: http://<your-public-ip>${public_suffix}/docs"
echo "Health: ${health_url}"
echo "Logs: $(docker_prefix) logs -f ${APP_CONTAINER}"
