# ── Stage 1: Build Next.js ──────────────────────────────────────
FROM node:20-alpine AS dashboard-builder
WORKDIR /dashboard
COPY dashboard/package*.json ./
RUN npm ci
COPY dashboard/ .
# Ensure public dir exists (Next.js requires it for standalone copy)
RUN mkdir -p public
# Empty string so browser fetches use relative paths (routed by Nginx)
ENV NEXT_PUBLIC_API_URL=""
RUN npm run build

# ── Stage 2: Runtime ─────────────────────────────────────────────
# Pin to bookworm (Debian 12) — NodeSource supports it reliably
FROM python:3.11-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive

# System deps: nginx, supervisor, node 20, gettext (for envsubst)
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    gettext-base \
    curl \
    ca-certificates \
    gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
       | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" \
       | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
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
COPY sentinel.conf.template /etc/nginx/conf.d/sentinel.conf.template
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 10000
CMD ["/start.sh"]
