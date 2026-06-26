#!/bin/bash
# ── Sentinel AWS EC2 Setup Script ────────────────────────────────────────────
# Run this on your EC2 instance after first SSH login:
#   curl -fsSL https://raw.githubusercontent.com/saransh21122112/ai-content-moderation-agent/main/deploy/aws-ec2-setup.sh | bash
# Or: scp this file to the instance and run: bash aws-ec2-setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo "==> Installing Docker..."
apt-get update -qq
apt-get install -y --no-install-recommends ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -qq
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker
systemctl start docker

echo "==> Cloning repo..."
cd /opt
git clone https://github.com/saransh21122112/ai-content-moderation-agent.git sentinel || (cd sentinel && git pull)
cd sentinel

echo "==> Writing .env file..."
cat > .env <<'ENVEOF'
# ── Required: fill these in ──────────────────────────────────────────────────
OPENAI_API_KEY=sk-your-key-here
DATABASE_URL=postgresql+asyncpg://sentinel:sentinel@db:5432/sentinel_db
REDIS_URL=redis://redis:6379/0
JWT_SECRET=change-me-to-a-long-random-string
ADMIN_EMAIL=admin@sentinel.ai
ADMIN_PASSWORD=Admin@Sentinel123
ADMIN_USERNAME=admin
DEFAULT_API_KEY=test-api-key-12345
PORT=80
# ── Optional ─────────────────────────────────────────────────────────────────
TRIAGE_MODEL=gpt-4o-mini
ANALYSIS_MODEL=gpt-4o
EMBEDDING_MODEL=text-embedding-3-small
ENVEOF

echo "==> Done. Edit /opt/sentinel/.env then run: cd /opt/sentinel && docker compose -f deploy/docker-compose.aws.yml up -d"
