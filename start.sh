#!/bin/bash
set -e

export PORT="${PORT:-10000}"

# Substitute PORT into our nginx server block and drop it into conf.d
envsubst '$PORT' < /etc/nginx/conf.d/sentinel.conf.template > /etc/nginx/conf.d/sentinel.conf

# Remove Debian default site so it doesn't conflict
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/conf.d/default.conf

# Quick config sanity check
nginx -t

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
