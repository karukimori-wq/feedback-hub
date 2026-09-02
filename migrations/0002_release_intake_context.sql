ALTER TABLE feedback_conversations ADD COLUMN source_app TEXT NOT NULL DEFAULT '';
ALTER TABLE feedback_conversations ADD COLUMN plan_id TEXT;
ALTER TABLE feedback_conversations ADD COLUMN current_screen TEXT;
ALTER TABLE feedback_conversations ADD COLUMN submitted_category TEXT;
ALTER TABLE feedback_conversations ADD COLUMN correlation_id TEXT;

UPDATE feedback_conversations
SET source_app = app_id
WHERE source_app = '';

CREATE INDEX IF NOT EXISTS idx_feedback_conversations_source_app_plan ON feedback_conversations(source_app, plan_id);
CREATE INDEX IF NOT EXISTS idx_feedback_conversations_correlation ON feedback_conversations(correlation_id);
