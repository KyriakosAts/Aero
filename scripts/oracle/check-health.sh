#!/usr/bin/env bash

set -euo pipefail

HOST_PORT="${HOST_PORT:-80}"

curl -fsS "http://127.0.0.1:${HOST_PORT}/api/health"
echo
