CREATE TABLE IF NOT EXISTS moderation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    status VARCHAR(50) DEFAULT 'pending',
    result TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) UNIQUE,
    url VARCHAR(2000) NOT NULL,
    secret VARCHAR(255),
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_jobs_tenant_id ON moderation_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_moderation_jobs_status ON moderation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_moderation_decisions_tenant_created ON moderation_decisions(tenant_id, created_at DESC);
