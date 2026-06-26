#!/bin/bash
set -e

# Render assigns a dynamic PORT — substitute it into the nginx config
export PORT="${PORT:-10000}"
envsubst '$PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Pass Render env vars into the Next.js process via supervisord env
# (API_URL is the internal server-side URL for Next.js server actions)
export API_URL="${API_URL:-http://127.0.0.1:8000}"

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
