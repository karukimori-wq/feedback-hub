CREATE TABLE IF NOT EXISTS feedback_conversations (
  conversation_id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  app_name TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  route TEXT,
  screen_name TEXT,
  app_version TEXT,
  device TEXT,
  browser TEXT,
  occurred_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback_messages (
  message_id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES feedback_conversations(conversation_id)
);

CREATE TABLE IF NOT EXISTS feedback_ai_analyses (
  analysis_id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  impact TEXT NOT NULL,
  confidence REAL NOT NULL,
  summary TEXT NOT NULL,
  normalized_problem TEXT NOT NULL,
  suggested_questions_json TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES feedback_conversations(conversation_id)
);

CREATE TABLE IF NOT EXISTS feedback_issues (
  issue_id TEXT PRIMARY KEY,
  canonical_title TEXT NOT NULL,
  normalized_problem TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  impact TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  priority_score INTEGER NOT NULL,
  priority_components_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback_issue_links (
  issue_link_id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  analysis_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  similarity_score REAL NOT NULL,
  match_reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (issue_id) REFERENCES feedback_issues(issue_id),
  FOREIGN KEY (analysis_id) REFERENCES feedback_ai_analyses(analysis_id),
  FOREIGN KEY (conversation_id) REFERENCES feedback_conversations(conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_conversations_workspace ON feedback_conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_feedback_messages_conversation ON feedback_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_analyses_conversation ON feedback_ai_analyses(conversation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_issues_ranking ON feedback_issues(category, status, priority_score DESC, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_issue_links_issue ON feedback_issue_links(issue_id);
