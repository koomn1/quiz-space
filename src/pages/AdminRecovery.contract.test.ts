import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const cosmoSource = readFileSync(new URL('./AIChat.tsx', import.meta.url), 'utf8');
const adminSource = readFileSync(new URL('./AdminDashboard.tsx', import.meta.url), 'utf8');
const subscriptionsSource = readFileSync(new URL('../components/AdminSubscriptions.tsx', import.meta.url), 'utf8');

describe('admin and Cosmo recovery contracts', () => {
  it('supports expanded Cosmo quiz counts and splits large generations into safe batches', () => {
    expect(cosmoSource).toContain('const COSMO_QUIZ_MAX_COUNT = 100');
    expect(cosmoSource).toContain('const COSMO_QUIZ_BATCH_SIZE = 25');
    expect(cosmoSource).toContain('const COSMO_QUIZ_COUNT_OPTIONS = [5, 10, 20, 30, 50, 75, 100]');
    expect(cosmoSource).toContain('generateCosmoQuizInBatches');
    expect(cosmoSource).toContain('normalized.replace(/[٠-٩]/g');
    expect(cosmoSource).not.toContain('Math.min(20, Math.max(3, amountMatch');
  });

  it('keeps trial offer state outside the coupons map callback', () => {
    expect(subscriptionsSource).toContain('const [trialOffers, setTrialOffers] = useState<Record<number, boolean>>');
    expect(subscriptionsSource).toContain('const toggleTrialOffer = (days: number)');
    expect(subscriptionsSource).toContain('onClick={() => toggleTrialOffer(days)}');
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
