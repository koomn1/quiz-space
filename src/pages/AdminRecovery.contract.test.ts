import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const cosmoSource = readFileSync(new URL('./AIChat.tsx', import.meta.url), 'utf8');
const cosmoCountSource = readFileSync(new URL('../lib/cosmoQuizCount.ts', import.meta.url), 'utf8');
const adminSource = readFileSync(new URL('./AdminDashboard.tsx', import.meta.url), 'utf8');
const subscriptionsSource = readFileSync(new URL('../components/AdminSubscriptions.tsx', import.meta.url), 'utf8');

describe('admin and Cosmo recovery contracts', () => {
  it('supports Cosmo-selected quiz counts, explicit counts, and safe generation batches', () => {
    expect(cosmoCountSource).toContain('COSMO_QUIZ_MAX_COUNT = 100');
    expect(cosmoCountSource).toContain('COSMO_QUIZ_COUNT_OPTIONS = [5, 10, 20, 30, 50, 75, 100]');
    expect(cosmoSource).toContain('const COSMO_QUIZ_BATCH_SIZE = 10');
    expect(cosmoSource).toContain('generateCosmoQuizInBatches');
    expect(cosmoSource).toContain('parseAutomaticQuestionCount');
    expect(cosmoSource).toContain('const amount = explicitCount ?? 0');
    expect(cosmoSource).toContain('pendingQuiz.amount === 0');
    expect(cosmoSource).not.toContain('Math.min(20, Math.max(3, amountMatch');
  });

  it('keeps trial offer state outside the coupons map callback', () => {
    expect(subscriptionsSource).toContain('const [trialOffers, setTrialOffers] = useState<Record<TrialOfferDuration, boolean>>');
    expect(subscriptionsSource).toContain('const toggleTrialOffer = async (days: TrialOfferDuration)');
    expect(subscriptionsSource).toContain('onClick={() => void toggleTrialOffer(days)}');
    expect(subscriptionsSource).toContain('updateTrialOfferState(days, nextState)');
    expect(subscriptionsSource).not.toContain('const [isLive, setIsLive] = useState');
  });

  it('keeps AI monitoring data loading fail-safe and exposes retry feedback', () => {
    expect(adminSource).toContain('const loadAiMonitoringLogs = async () =>');
    expect(adminSource).toContain('setAiLogs(Array.isArray(logs)');
    expect(adminSource).toContain('setAiMonitoringError');
    expect(adminSource).toContain('onClick={() => void loadAiMonitoringLogs()}');
    expect(adminSource).toContain('aiMonitoringError &&');
  });
});
