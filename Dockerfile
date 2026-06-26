# ── Stage 1: Build Next.js ──────────────────────────────────────
FROM node:20-alpine AS dashboard-builder
WORKDIR /dashboard
COPY dashboard/package*.json ./
RUN npm ci
COPY dashboard/ .
# Empty string so browser fetches use relative paths (routed by Nginx)
ENV NEXT_PUBLIC_API_URL=""
RUN npm run build

# ── Stage 2: Runtime ─────────────────────────────────────────────
FROM python:3.11-slim

# System deps: nginx, supervisor, node, gettext (for envsubst)
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    gettext-base \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Python deps
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# FastAPI app + landing page
COPY app/ ./app/
COPY static/ ./static/

# Next.js standalone build
COPY --from=dashboard-builder /dashboard/.next/standalone /dashboard/
COPY --from=dashboard-builder /dashboard/.next/static /dashboard/.next/static
COPY --from=dashboard-builder /dashboard/public /dashboard/public

# Nginx template + supervisor config + entrypoint
COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 10000
CMD ["/start.sh"]
