import type { ActiveLearningSeason, KnowledgeDuelState, MotivationUsageSummary, MotivationUsageTab, PersonalLearningImprovement, SmartReviewCard } from '../types';

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {};
}

function number(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeSmartReviewPayload(payload: unknown): { cards: SmartReviewCard[]; windowDays: number } {
  const data = record(payload);
  const rawCards = Array.isArray(data.cards) ? data.cards : [];
  const cards = rawCards.map((candidate) => {
    const card = record(candidate);
    return {
      topic: String(card.topic || 'general'),
      attempts: Math.max(0, number(card.attempts)),
      accuracy: Math.max(0, Math.min(100, number(card.accuracy))),
      lastAttemptAt: card.last_attempt_at ? String(card.last_attempt_at) : undefined,
      quizIds: Array.isArray(card.quiz_ids) ? card.quiz_ids.map(String) : [],
    };
  });
  return { cards, windowDays: Math.max(1, number(data.window_days, 60)) };
}

export function normalizePersonalLearningImprovement(payload: unknown): PersonalLearningImprovement {
  const data = record(payload);
  const period = (candidate: unknown) => {
    const value = record(candidate);
    return {
      days: Math.max(1, number(value.days, 28)),
      completed: Math.max(0, number(value.completed)),
      accuracy: Math.max(0, Math.min(100, number(value.accuracy))),
    };
  };
  return {
    currentPeriod: period(data.current_period),
    previousPeriod: period(data.previous_period),
    accuracyChange: number(data.accuracy_change),
    completionChange: number(data.completion_change),
  };
}

export function normalizeLearningSeasonPayload(payload: unknown): ActiveLearningSeason {
  const data = record(payload);
  const rawSeason = record(data.season);
  const season = rawSeason.id ? {
    id: String(rawSeason.id),
    name: String(rawSeason.name || ''),
    nameAr: rawSeason.name_ar ? String(rawSeason.name_ar) : undefined,
    description: rawSeason.description ? String(rawSeason.description) : undefined,
    descriptionAr: rawSeason.description_ar ? String(rawSeason.description_ar) : undefined,
    endsAt: String(rawSeason.ends_at || ''),
  } : null;
  const choices = (Array.isArray(data.choices) ? data.choices : []).map((candidate) => {
    const choice = record(candidate);
    const type: 'points' | 'coins' | 'badge' = choice.type === 'coins' || choice.type === 'badge' ? choice.type : 'points';
    return {
      key: String(choice.key || ''), type,
      amount: Math.max(0, number(choice.amount)),
      badgeId: choice.badge_id ? String(choice.badge_id) : undefined,
      requiredQuizzes: Math.max(0, number(choice.required_quizzes)),
    };
  }).filter((choice) => choice.key.length > 0);
  return {
    season,
    completedQuizzes: Math.max(0, number(data.completed_quizzes)),
    choices,
    claimedChoice: data.claimed_choice ? String(data.claimed_choice) : undefined,
  };
}

export function normalizeKnowledgeDuelPayload(payload: unknown): KnowledgeDuelState {
  const data = record(payload);
  const status = ['waiting', 'active', 'completed', 'expired', 'cancelled'].includes(String(data.status)) ? String(data.status) as KnowledgeDuelState['status'] : 'waiting';
  const questionCount = Math.max(1, Math.min(5, number(data.question_count, 5)));
  const answeredCount = Math.max(0, Math.min(questionCount, number(data.answered_count)));
  const rawRound = record(data.round);
  const options = Array.isArray(rawRound.options) ? rawRound.options.map(String).filter(Boolean) : [];
  const round = rawRound.sequence && options.length >= 2 ? {
    sequence: Math.max(1, Math.min(questionCount, number(rawRound.sequence))),
    promptAr: String(rawRound.prompt_ar || ''),
    promptEn: String(rawRound.prompt_en || ''),
    options,
  } : undefined;
  const rawResult = record(data.result);
  const result = rawResult.outcome && ['win', 'tie', 'loss'].includes(String(rawResult.outcome)) ? {
    myScore: Math.max(0, Math.min(questionCount, number(rawResult.my_score))),
    opponentScore: Math.max(0, Math.min(questionCount, number(rawResult.opponent_score))),
    outcome: String(rawResult.outcome) as 'win' | 'tie' | 'loss',
  } : undefined;
  return { status, questionCount, answeredCount, opponentFinished: Boolean(data.opponent_finished), round, result };
}

export function hasUsedLuckySpinToday(payload: unknown): boolean {
  return Boolean(record(payload).lucky_spin);
}

const motivationUsageTabs: MotivationUsageTab[] = ['motivation', 'motivation-lucky', 'motivation-brain', 'motivation-review', 'motivation-season', 'motivation-duel', 'motivation-store'];

export function normalizeMotivationUsageSummary(payload: unknown): MotivationUsageSummary {
  const data = record(payload);
  const rawTabs = Array.isArray(data.tabs) ? data.tabs : [];
  const tabs = rawTabs.map((candidate) => {
    const item = record(candidate);
    const tab = motivationUsageTabs.includes(String(item.tab) as MotivationUsageTab) ? String(item.tab) as MotivationUsageTab : null;
    if (!tab) return null;
    return {
      tab,
      uniqueDailyOpens: Math.max(0, number(item.unique_daily_opens)),
      uniqueLearners: Math.max(0, number(item.unique_learners)),
      uniqueDailyEngagements: Math.max(0, number(item.unique_daily_engagements)),
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null);
  const rawDaily = Array.isArray(data.daily) ? data.daily : [];
  const daily = rawDaily.map((candidate) => {
    const item = record(candidate);
    const date = item.date ? String(item.date) : '';
    return date ? {
      date,
      uniqueDailyOpens: Math.max(0, number(item.unique_daily_opens)),
      uniqueLearners: Math.max(0, number(item.unique_learners)),
    } : null;
  }).filter((item): item is NonNullable<typeof item> => item !== null);
  return {
    windowDays: Math.max(7, Math.min(90, number(data.window_days, 30))),
    totalUniqueDailyOpens: Math.max(0, number(data.total_unique_daily_opens)),
    totalUniqueLearners: Math.max(0, number(data.total_unique_learners)),
    totalUniqueDailyEngagements: Math.max(0, number(data.total_unique_daily_engagements)),
    tabs,
    daily,
  };
}
