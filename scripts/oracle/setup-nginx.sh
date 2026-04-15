#!/usr/bin/env bash
# Sets up Nginx as a reverse proxy for the backend.
# Optional: pass DOMAIN and EMAIL to enable HTTPS via Let's Encrypt.
#
# Usage:
#   bash scripts/oracle/setup-nginx.sh                           # HTTP only
#   DOMAIN=api.example.com EMAIL=you@email.com bash scripts/oracle/setup-nginx.sh  # + HTTPS
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"

as_root() {
    if [[ "$(id -u)" -eq 0 ]]; then "$@"; else sudo "$@"; fi
}

echo "Installing Nginx..."
as_root apt-get update
as_root apt-get install -y nginx

echo "Deploying Nginx config..."
as_root cp "${SCRIPT_DIR}/nginx/aero-backend.conf" /etc/nginx/sites-available/aero-backend
as_root ln -sf /etc/nginx/sites-available/aero-backend /etc/nginx/sites-enabled/aero-backend
as_root rm -f /etc/nginx/sites-enabled/default

as_root nginx -t
as_root systemctl enable --now nginx
as_root systemctl reload nginx
echo "Nginx is running (HTTP)."

if [[ -n "$DOMAIN" && -n "$EMAIL" ]]; then
    echo "Installing Certbot..."
    as_root apt-get install -y certbot python3-certbot-nginx

    echo "Requesting TLS certificate for ${DOMAIN}..."
    as_root certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect
    echo "HTTPS enabled. Certbot auto-renewal is active via systemd timer."
else
    echo ""
    echo "To enable HTTPS later, run:"
    echo "  sudo apt install certbot python3-certbot-nginx"
    echo "  sudo certbot --nginx -d YOUR_DOMAIN --agree-tos -m YOUR_EMAIL --redirect"
fi

echo "Nginx setup complete."
