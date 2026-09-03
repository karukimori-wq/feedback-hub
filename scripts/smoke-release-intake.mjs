const baseUrl = normalizeBaseUrl(process.env.FEEDBACK_HUB_WORKER_URL ?? process.argv[2]);

if (!baseUrl) {
  console.error('Usage: FEEDBACK_HUB_WORKER_URL=https://your-worker.example npm run smoke:release-intake');
  console.error('   or: npm run smoke:release-intake -- https://your-worker.example');
  process.exit(1);
}

const results = [];

await checkJson('GET /health', '/health', {
  method: 'GET',
  expect: (body) => body.status === 'success',
});
await checkJson('GET /version', '/version', {
  method: 'GET',
  expect: (body) => body.appName === 'feedback-hub' && typeof body.contractVersion === 'string',
});
await checkJson('GET /contracts/status', '/contracts/status', {
  method: 'GET',
  expect: (body) => body.aiProvider === 'ai-platform-core'
    && body.releaseReadySourceApps?.includes('numeria-studio')
    && body.releaseReadySourceApps?.includes('velvet')
    && body.acceptedPlanIds?.includes('free')
    && body.acceptedPlanIds?.includes('pro')
    && body.bugReportsRateLimitedByPlan === false
    && body.sensitiveBodyRedaction === true,
});
await checkJson('GET /api/admin/release-readiness', '/api/admin/release-readiness', {
  method: 'GET',
  expect: (body) => body.status === 'success'
    && body.readiness?.releaseScope?.sourceApps?.includes('numeria-studio')
    && body.readiness?.releaseScope?.sourceApps?.includes('velvet'),
});
await checkJson('GET /api/admin/intake-metrics numeria free', '/api/admin/intake-metrics?sourceApp=numeria-studio&planId=free', {
  method: 'GET',
  expect: (body) => body.status === 'success' && body.metrics?.filters?.sourceApp === 'numeria-studio' && body.metrics?.filters?.planId === 'free',
});
await checkJson('POST /api/feedback/intake numeria free', '/api/feedback/intake', {
  method: 'POST',
  body: releaseFeedback({
    appId: 'numeria-studio',
    appName: 'Numeria Studio',
    planId: 'free',
    category: 'Question',
    initialMessage: 'Freeプランの鑑定上限はどこで確認できますか？',
    correlationId: `smoke_numeria_free_${Date.now()}`,
  }),
  expect: (body) => body.status === 'success' && body.intake?.status === 'accepted',
});
await checkJson('POST /api/embed/feedback velvet pro', '/api/embed/feedback', {
  method: 'POST',
  body: releaseFeedback({
    appId: 'velvet',
    appName: 'Velvet',
    planId: 'pro',
    category: 'Bug',
    initialMessage: 'Pro契約したのにアップグレードが反映されません。決済番号やカード番号は本文に入れません。',
    correlationId: `smoke_velvet_pro_${Date.now()}`,
  }),
  expect: (body) => body.status === 'success' && body.intake?.status === 'accepted',
});

const failures = results.filter((result) => result.status !== 'pass');
for (const result of results) {
  console.log(`${result.status === 'pass' ? 'PASS' : 'FAIL'} ${result.name} ${result.statusCode}`);
  if (result.error) console.log(`  ${result.error}`);
}

if (failures.length > 0) {
  process.exit(1);
}

function normalizeBaseUrl(value) {
  if (!value) return '';
  return value.replace(/\/+$/, '');
}

async function checkJson(name, path, options) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }

  const ok = response.ok && body && options.expect(body);
  results.push({
    name,
    status: ok ? 'pass' : 'fail',
    statusCode: response.status,
    error: ok ? null : text.slice(0, 300),
  });
}

function releaseFeedback(overrides) {
  return {
    sourceApp: overrides.appId,
    appVersion: 'smoke-0.1.0',
    workspaceId: 'smoke_workspace',
    userId: 'smoke_user',
    currentScreen: 'Smoke Test',
    route: '/smoke',
    screenName: 'Smoke Test',
    device: 'smoke',
    browser: 'smoke',
    occurredAt: new Date().toISOString(),
    ...overrides,
  };
}
