import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const reportSource = readFileSync(new URL('./QuizDetailedReport.tsx', import.meta.url), 'utf8');
const resolverSource = readFileSync(new URL('./QuizResolver.tsx', import.meta.url), 'utf8');

describe('question rating error visibility', () => {
  it('passes the save error into the visible detailed report and renders it accessibly', () => {
    expect(resolverSource).toContain('questionRatingErrors={questionRatingErrors}');
    expect(reportSource).toContain('questionRatingErrors: Record<string, string>');
    expect(reportSource).toContain('questionRatingErrors[qId]');
    expect(reportSource).toContain('role="alert"');
  });

  it('shows a database error code when the upsert is rejected', () => {
    expect(resolverSource).toContain('const errorCode = typeof (error as any)?.code');
    expect(resolverSource).toContain('تعذر حفظ تقييم السؤال');
  });
});
