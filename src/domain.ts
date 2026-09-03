export const APP_NAME = 'feedback-hub';
export const CONTRACT_VERSION = '0.1.0';
export const SUPPORTED_SOURCE_APPS = ['numeria-studio', 'velvet', 'sns-planner', 'communication-planner', 'growth-engine'] as const;
export const RELEASE_READY_SOURCE_APPS = ['numeria-studio', 'velvet'] as const;
export const ACCEPTED_PLAN_IDS = ['free', 'pro', 'business'] as const;
export const RELEASE_CONTEXT_FIELDS = ['sourceApp', 'appVersion', 'planId', 'workspaceId', 'userId', 'currentScreen', 'category', 'occurredAt', 'correlationId'] as const;

export type FeedbackCategory = 'Question' | 'Bug' | 'Improvement' | 'Feature Request' | 'UX Feedback' | 'Other';
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type Impact = 'Critical' | 'High' | 'Medium' | 'Low';

export interface FeedbackAnalysis {
  category: FeedbackCategory;
  severity: Severity;
  impact: Impact;
  confidence: number;
  summary: string;
  normalizedProblem: string;
  suggestedQuestions: string[];
  priorityComponents: PriorityComponents;
  priorityScore: number;
}

export interface PriorityComponents {
  severityWeight: number;
  countWeight: number;
  impactWeight: number;
}

const bugWords = ['bug', 'error', 'fail', 'failed', 'broken', 'cannot', "can't", 'crash', '保存できない', '保存されない', '残らない', '登録失敗', '失敗', 'エラー', '動かない', 'ログインできない', '課金できない', '反映されない', '反映しない', 'アップグレードできない'];
const questionWords = ['how', 'what', 'why', 'where', 'when', 'どこ', 'なぜ', 'どう', '質問', '教えて', '上限', '無料枠', 'free', 'プラン'];
const requestWords = ['want', 'need', 'feature', 'ほしい', '欲しい', '追加', 'できるように', '比較', '見たい'];
const uxWords = ['confusing', 'hard to use', 'わかりづらい', '分かりづらい', '使いづらい', '見づらい', '押しづらい'];
const criticalWords = ['login', 'payment', 'checkout', 'auth', 'ログイン', '課金', '決済', '支払い', '保存できない', '保存されない', 'データが残らない', 'データ消失', '消えた', '購入したのに', 'proにならない', 'proが反映されない'];

export function analyzeFeedbackText(input: string, linkedCount = 1): FeedbackAnalysis {
  const text = input.trim();
  const lower = text.toLowerCase();
  const category = classifyCategory(lower);
  const severity = classifySeverity(lower, category);
  const impact = classifyImpact(lower, category);
  const normalizedProblem = normalizeProblem(lower);
  const summary = buildSummary(category, normalizedProblem);
  const suggestedQuestions = buildSuggestedQuestions(category, lower);
  const priorityComponents = buildPriorityComponents(severity, impact, linkedCount);
  const priorityScore = calculatePriorityScore(priorityComponents);

  return {
    category,
    severity,
    impact,
    confidence: 0.72,
    summary,
    normalizedProblem,
    suggestedQuestions,
    priorityComponents,
    priorityScore,
  };
}

export function calculatePriorityScore(components: PriorityComponents): number {
  return Math.round(components.severityWeight * components.countWeight * components.impactWeight);
}

export function similarityScore(a: string, b: string): number {
  const left = tokenize(normalizeProblem(a));
  const right = tokenize(normalizeProblem(b));
  if (left.size === 0 || right.size === 0) return 0;
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return intersection / union;
}

export function makeIssueTitle(normalizedProblem: string, category: FeedbackCategory): string {
  if (normalizedProblem.includes('save-persistence')) return '保存処理の不具合';
  if (normalizedProblem.includes('login-access')) return 'ログインまたはアクセスの不具合';
  if (normalizedProblem.includes('payment-checkout')) return '課金または決済の不具合';
  if (normalizedProblem.includes('free-plan-limit-question')) return 'Free上限に関する質問';
  if (normalizedProblem.includes('pro-upgrade-entitlement')) return 'Pro契約またはアップグレード反映の問題';
  if (normalizedProblem.includes('comparison-view')) return '比較表示機能の要望';
  return `${category}: ${normalizedProblem.slice(0, 48)}`;
}

function classifyCategory(lower: string): FeedbackCategory {
  if (/(free|無料|上限|無料枠|月20|20件|3名|3件).*(\?|？|ですか|ますか|教えて|どう|なぜ|どこ)|(\?|？|ですか|ますか|教えて|どう|なぜ|どこ).*(free|無料|上限|無料枠|月20|20件|3名|3件)/i.test(lower)) return 'Question';
  if (includesAny(lower, bugWords)) return 'Bug';
  if (includesAny(lower, uxWords)) return 'UX Feedback';
  if (includesAny(lower, requestWords)) return 'Feature Request';
  if (includesAny(lower, questionWords) || lower.endsWith('?') || lower.endsWith('？')) return 'Question';
  return 'Other';
}

function classifySeverity(lower: string, category: FeedbackCategory): Severity {
  if (includesAny(lower, criticalWords)) return 'Critical';
  if (category === 'Bug') return 'High';
  if (category === 'Feature Request') return 'Medium';
  return 'Low';
}

function classifyImpact(lower: string, category: FeedbackCategory): Impact {
  if (includesAny(lower, criticalWords)) return 'Critical';
  if (category === 'Bug') return 'High';
  if (category === 'Feature Request') return 'Medium';
  return 'Low';
}

function normalizeProblem(lower: string): string {
  if (/(保存できない|保存されない|残らない|登録失敗|save|persist|persistence)/i.test(lower)) return 'save-persistence';
  if (/(ログイン|login|auth|access)/i.test(lower)) return 'login-access';
  if (/(pro|プロ|upgrade|アップグレード|契約).*(反映されない|反映しない|できない|失敗|ならない|使えない|購入したのに)|購入したのに.*(pro|プロ|使えない)/i.test(lower)) return 'pro-upgrade-entitlement';
  if (/(free|無料|上限|無料枠|月20|20件|3名|3件)/i.test(lower)) return 'free-plan-limit-question';
  if (/(課金|決済|支払い|payment|checkout|billing)/i.test(lower)) return 'payment-checkout';
  if (/(比較|compare|comparison|前回)/i.test(lower)) return 'comparison-view';
  return lower.replace(/\s+/g, ' ').slice(0, 96);
}

function buildSummary(category: FeedbackCategory, normalizedProblem: string): string {
  return `${category} feedback about ${normalizedProblem}`;
}

function buildSuggestedQuestions(category: FeedbackCategory, lower: string): string[] {
  if (category !== 'Bug') return [];
  const questions = [];
  if (!/(route|画面|ページ)/i.test(lower)) questions.push('どの画面で発生しましたか？');
  if (!/(操作|クリック|入力|保存|登録)/i.test(lower)) questions.push('直前にどの操作をしましたか？');
  return questions;
}

function buildPriorityComponents(severity: Severity, impact: Impact, count: number): PriorityComponents {
  return {
    severityWeight: weightSeverity(severity),
    countWeight: Math.max(1, Math.min(10, Math.ceil(count / 3))),
    impactWeight: weightImpact(impact),
  };
}

function weightSeverity(severity: Severity): number {
  return { Critical: 10, High: 7, Medium: 4, Low: 2 }[severity];
}

function weightImpact(impact: Impact): number {
  return { Critical: 10, High: 7, Medium: 4, Low: 2 }[impact];
}

function includesAny(value: string, words: string[]): boolean {
  return words.some((word) => value.includes(word.toLowerCase()));
}

function tokenize(value: string): Set<string> {
  return new Set(value.toLowerCase().split(/[^a-z0-9\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]+/u).filter(Boolean));
}
