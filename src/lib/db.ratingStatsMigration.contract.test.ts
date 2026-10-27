import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../supabase/migrations/20261027075000_sync_quiz_rating_stats.sql', import.meta.url),
  'utf8',
);

describe('quiz rating stats migration contract', () => {
  it('aggregates authenticated and guest ratings and ignores null ratings', () => {
    expect(migration).toContain('FROM public.completions AS c');
    expect(migration).toContain('FROM public.guest_quiz_attempts AS g');
    expect(migration.match(/rating IS NOT NULL/g)).toHaveLength(2);
    expect(migration).toContain('UNION ALL');
    expect(migration).toContain('ROUND(AVG(rating)::numeric, 2)');
  });

  it('synchronizes on insert, rating/quiz change, and delete without editing source ratings', () => {
    expect(migration).toContain('AFTER INSERT OR DELETE ON public.completions');
    expect(migration).toContain('AFTER UPDATE OF rating, quiz_id ON public.completions');
    expect(migration).toContain('AFTER INSERT OR DELETE ON public.guest_quiz_attempts');
    expect(migration).toContain('AFTER UPDATE OF rating, quiz_id ON public.guest_quiz_attempts');
    expect(migration).toContain('SET avg_rating = v_average,');
    expect(migration).toContain('ratings_count = v_rating_count');
    expect(migration).not.toMatch(/UPDATE\s+public\.(completions|guest_quiz_attempts)/i);
    expect(migration).not.toMatch(/DELETE\s+FROM\s+public\.(completions|guest_quiz_attempts)/i);
  });
});
