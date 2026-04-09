#!/usr/bin/env bash

set -euo pipefail

SWAP_SIZE_GB="${SWAP_SIZE_GB:-4}"
ENABLE_SWAP="${ENABLE_SWAP:-true}"

as_root() {
    if [[ "$(id -u)" -eq 0 ]]; then
        "$@"
    else
        sudo "$@"
    fi
}

if ! command -v apt-get >/dev/null 2>&1; then
    echo "This script currently supports Ubuntu/Debian hosts only."
    exit 1
fi

echo "Installing host packages..."
as_root apt-get update
as_root apt-get install -y ca-certificates curl git docker.io

echo "Enabling Docker service..."
as_root systemctl enable --now docker

target_user="${SUDO_USER:-${USER}}"
if id -nG "$target_user" | tr ' ' '\n' | grep -Fxq docker; then
    echo "User '$target_user' is already in the docker group."
else
    echo "Adding '$target_user' to the docker group..."
    as_root usermod -aG docker "$target_user"
    echo "Docker group updated. Log out and back in later if you want passwordless docker commands."
fi

if [[ "$ENABLE_SWAP" == "true" ]]; then
    if swapon --show --noheadings | grep -q .; then
        echo "Swap is already enabled."
    elif [[ -f /swapfile ]]; then
        echo "Swap file already exists at /swapfile."
    else
        echo "Creating ${SWAP_SIZE_GB}G swap file..."
        if ! as_root fallocate -l "${SWAP_SIZE_GB}G" /swapfile 2>/dev/null; then
            as_root dd if=/dev/zero of=/swapfile bs=1M count="$((SWAP_SIZE_GB * 1024))" status=progress
        fi
        as_root chmod 600 /swapfile
        as_root mkswap /swapfile
        as_root swapon /swapfile
        if ! grep -q '^/swapfile ' /etc/fstab; then
            echo '/swapfile none swap sw 0 0' | as_root tee -a /etc/fstab >/dev/null
        fi
    fi
fi

echo "Host setup complete."
echo "Next steps:"
echo "  1. Clone the repo if you have not done that yet."
echo "  2. Run: bash scripts/oracle/deploy-fullstack.sh"
