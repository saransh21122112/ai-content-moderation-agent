CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS moderation_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    content_id VARCHAR(255),
    content_text TEXT,
    content_type VARCHAR(50) DEFAULT 'text',
    user_id VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    confidence FLOAT NOT NULL,
    categories TEXT[],
    explanation TEXT,
    appeal_text TEXT,
    triage_result VARCHAR(50),
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID REFERENCES moderation_decisions(id),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID REFERENCES moderation_decisions(id),
    appeal_reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    reviewer_id VARCHAR(255),
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

INSERT INTO tenants (name, api_key)
VALUES ('test_platform', 'test-api-key-12345')
ON CONFLICT (api_key) DO NOTHING;
