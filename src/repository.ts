import { analyzeFeedbackText, makeIssueTitle, similarityScore, type FeedbackAnalysis } from './domain';
import { newId, nowIso } from './ids';
import type { CreateConversationInput, CreateMessageInput } from './schemas';

export async function createConversation(db: D1Database, input: CreateConversationInput) {
  const now = nowIso();
  const conversationId = newId('conv');
  const occurredAt = input.occurredAt ?? now;

  await db.prepare(`INSERT INTO feedback_conversations (
    conversation_id, app_id, app_name, workspace_id, user_id, route, screen_name,
    app_version, device, browser, occurred_at, status, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      conversationId,
      input.appId,
      input.appName,
      input.workspaceId,
      input.userId,
      input.route ?? null,
      input.screenName ?? null,
      input.appVersion ?? null,
      input.device ?? null,
      input.browser ?? null,
      occurredAt,
      'open',
      now,
      now,
    )
    .run();

  let initialMessage = null;
  if (input.initialMessage) {
    initialMessage = await createMessage(db, conversationId, { role: 'user', body: input.initialMessage });
  }

  return { conversationId, status: 'open', initialMessage };
}

export async function createMessage(db: D1Database, conversationId: string, input: CreateMessageInput) {
  await assertConversationExists(db, conversationId);
  const messageId = newId('msg');
  const createdAt = nowIso();

  await db.prepare(`INSERT INTO feedback_messages (message_id, conversation_id, role, body, created_at) VALUES (?, ?, ?, ?, ?)`).bind(
    messageId,
    conversationId,
    input.role,
    input.body,
    createdAt,
  ).run();

  await db.prepare(`UPDATE feedback_conversations SET updated_at = ? WHERE conversation_id = ?`).bind(createdAt, conversationId).run();

  return { messageId, conversationId, role: input.role, createdAt };
}

export async function analyzeConversation(db: D1Database, conversationId: string) {
  await assertConversationExists(db, conversationId);
  const messages = await db.prepare(`SELECT body FROM feedback_messages WHERE conversation_id = ? ORDER BY created_at ASC`).bind(conversationId).all<{ body: string }>();
  const text = messages.results.map((message) => message.body).join('\n');
  const analysis = analyzeFeedbackText(text || 'No message provided');
  const analysisId = await saveAnalysis(db, conversationId, analysis);
  const issue = await linkAnalysisToIssue(db, conversationId, analysisId, analysis);

  return { analysisId, analysis, issue };
}

export async function listIssues(db: D1Database, category?: string) {
  const sql = category
    ? `SELECT * FROM feedback_issues WHERE category = ? ORDER BY priority_score DESC, last_seen_at DESC LIMIT 100`
    : `SELECT * FROM feedback_issues ORDER BY priority_score DESC, last_seen_at DESC LIMIT 100`;
  const result = category ? await db.prepare(sql).bind(category).all() : await db.prepare(sql).all();
  return result.results;
}

export async function getIssue(db: D1Database, issueId: string) {
  const issue = await db.prepare(`SELECT * FROM feedback_issues WHERE issue_id = ?`).bind(issueId).first();
  if (!issue) return null;
  const links = await db.prepare(`SELECT * FROM feedback_issue_links WHERE issue_id = ? ORDER BY created_at DESC`).bind(issueId).all();
  return { issue, links: links.results };
}

export async function urgentNotifications(db: D1Database) {
  const result = await db.prepare(`SELECT * FROM feedback_issues WHERE status = 'open' AND (severity = 'Critical' OR impact = 'Critical' OR count >= 30) ORDER BY priority_score DESC, last_seen_at DESC`).all();
  return result.results;
}

async function saveAnalysis(db: D1Database, conversationId: string, analysis: FeedbackAnalysis) {
  const analysisId = newId('ana');
  const createdAt = nowIso();

  await db.prepare(`INSERT INTO feedback_ai_analyses (
    analysis_id, conversation_id, category, severity, impact, confidence, summary,
    normalized_problem, suggested_questions_json, metadata_json, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    analysisId,
    conversationId,
    analysis.category,
    analysis.severity,
    analysis.impact,
    analysis.confidence,
    analysis.summary,
    analysis.normalizedProblem,
    JSON.stringify(analysis.suggestedQuestions),
    JSON.stringify({ classifier: 'deterministic-mvp' }),
    createdAt,
  ).run();

  return analysisId;
}

async function linkAnalysisToIssue(db: D1Database, conversationId: string, analysisId: string, analysis: FeedbackAnalysis) {
  const existing = await findBestIssue(db, analysis.normalizedProblem, analysis.category);
  const now = nowIso();

  if (existing && existing.score >= 0.72) {
    const count = Number(existing.issue.count) + 1;
    const updatedAnalysis = analyzeFeedbackText(analysis.normalizedProblem, count);
    await db.prepare(`UPDATE feedback_issues SET count = ?, severity = ?, impact = ?, priority_score = ?, priority_components_json = ?, last_seen_at = ?, updated_at = ? WHERE issue_id = ?`).bind(
      count,
      strongest(existing.issue.severity as string, updatedAnalysis.severity),
      strongest(existing.issue.impact as string, updatedAnalysis.impact),
      updatedAnalysis.priorityScore,
      JSON.stringify(updatedAnalysis.priorityComponents),
      now,
      now,
      existing.issue.issue_id,
    ).run();

    await createIssueLink(db, existing.issue.issue_id as string, analysisId, conversationId, existing.score, 'similar-normalized-problem');
    return { issueId: existing.issue.issue_id, linkedToExisting: true, similarityScore: existing.score };
  }

  const issueId = newId('issue');
  const title = makeIssueTitle(analysis.normalizedProblem, analysis.category);
  await db.prepare(`INSERT INTO feedback_issues (
    issue_id, canonical_title, normalized_problem, category, severity, impact, count,
    priority_score, priority_components_json, status, first_seen_at, last_seen_at, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    issueId,
    title,
    analysis.normalizedProblem,
    analysis.category,
    analysis.severity,
    analysis.impact,
    1,
    analysis.priorityScore,
    JSON.stringify(analysis.priorityComponents),
    'open',
    now,
    now,
    now,
    now,
  ).run();

  await createIssueLink(db, issueId, analysisId, conversationId, 1, 'new-canonical-issue');
  return { issueId, linkedToExisting: false, similarityScore: 1 };
}

async function findBestIssue(db: D1Database, normalizedProblem: string, category: string) {
  const result = await db.prepare(`SELECT * FROM feedback_issues WHERE category = ? AND status = 'open' ORDER BY last_seen_at DESC LIMIT 100`).bind(category).all<Record<string, unknown>>();
  let best: { issue: Record<string, unknown>; score: number } | null = null;
  for (const issue of result.results) {
    const score = similarityScore(normalizedProblem, String(issue.normalized_problem));
    if (!best || score > best.score) best = { issue, score };
  }
  return best;
}

async function createIssueLink(db: D1Database, issueId: string, analysisId: string, conversationId: string, score: number, reason: string) {
  await db.prepare(`INSERT INTO feedback_issue_links (issue_link_id, issue_id, analysis_id, conversation_id, similarity_score, match_reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(
    newId('link'),
    issueId,
    analysisId,
    conversationId,
    score,
    reason,
    nowIso(),
  ).run();
}

async function assertConversationExists(db: D1Database, conversationId: string) {
  const row = await db.prepare(`SELECT conversation_id FROM feedback_conversations WHERE conversation_id = ?`).bind(conversationId).first();
  if (!row) throw new Error('CONVERSATION_NOT_FOUND');
}

function strongest(a: string, b: string): string {
  const order = ['Low', 'Medium', 'High', 'Critical'];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}
