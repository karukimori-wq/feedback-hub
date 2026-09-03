import { spawnSync } from 'node:child_process';

const target = process.argv.includes('--local') ? '--local' : '--remote';
const databaseName = process.env.FEEDBACK_HUB_D1_DATABASE_NAME || 'feedback-hub';

const commands = [
  `ALTER TABLE feedback_conversations ADD COLUMN source_app TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE feedback_conversations ADD COLUMN plan_id TEXT`,
  `ALTER TABLE feedback_conversations ADD COLUMN current_screen TEXT`,
  `ALTER TABLE feedback_conversations ADD COLUMN submitted_category TEXT`,
  `ALTER TABLE feedback_conversations ADD COLUMN correlation_id TEXT`,
  `UPDATE feedback_conversations SET source_app = app_id WHERE source_app = ''`,
  `CREATE INDEX IF NOT EXISTS idx_feedback_conversations_source_app_plan ON feedback_conversations(source_app, plan_id)`,
  `CREATE INDEX IF NOT EXISTS idx_feedback_conversations_correlation ON feedback_conversations(correlation_id)`,
];

for (const command of commands) {
  const result = spawnSync('npx', ['wrangler', 'd1', 'execute', databaseName, target, '--command', command], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  if (result.status === 0) {
    process.stdout.write(`applied: ${command}\n`);
    continue;
  }

  if (isDuplicateColumnError(output)) {
    process.stdout.write(`already applied: ${command}\n`);
    continue;
  }

  process.stderr.write(output);
  process.exit(result.status ?? 1);
}

function isDuplicateColumnError(output) {
  return /duplicate column name|already exists/i.test(output);
}
