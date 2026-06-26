CREATE TABLE IF NOT EXISTS reviewer_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID REFERENCES moderation_decisions(id),
    reviewer_id VARCHAR(255) NOT NULL,
    action_taken VARCHAR(50) NOT NULL,
    override_action VARCHAR(50),
    override_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviewer_actions_decision_id ON reviewer_actions(decision_id);
CREATE INDEX IF NOT EXISTS idx_reviewer_actions_reviewer_id ON reviewer_actions(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_appeals_status ON appeals(status);
CREATE INDEX IF NOT EXISTS idx_appeals_decision_id ON appeals(decision_id);
