import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('dashboard delivery contract', () => {
  it('uses verified operational metrics and refresh feedback in the admin dashboard', async () => {
    const source = await readFile(new URL('./AdminDashboard.tsx', import.meta.url), 'utf8');

    expect(source).toContain('isLoadingOverview');
    expect(source).toContain('overviewRefreshKey');
    expect(source).toContain('A trustworthy operating view');
    expect(source).toContain('Premium adoption');
    expect(source).not.toContain('revenueEstimate');
  });

  it('uses real learning engagement metrics and an application loading signal in analytics', async () => {
    const [analyticsSource, appSource] = await Promise.all([
      readFile(new URL('./AnalyticsDashboard.tsx', import.meta.url), 'utf8'),
      readFile(new URL('../App.tsx', import.meta.url), 'utf8'),
    ]);

    expect(analyticsSource).toContain('isLoading?: boolean');
    expect(analyticsSource).toContain('averagePlaysPerCreatedQuiz');
    expect(analyticsSource).toContain('A quick read on your progress');
    expect(analyticsSource).not.toContain('totalRevenue');
    expect(appSource).toContain('isLoading={isLoadingQuizzes}');
  });
});
