import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../supabase/migrations/20260818_grant_institution_read_access.sql', import.meta.url),
  'utf8',
);

describe('Institution workspace read access', () => {
  it('grants reads only to authenticated users while leaving RLS as the scope guard', () => {
    expect(migration).toContain('GRANT SELECT ON TABLE public.institutions TO authenticated;');
    expect(migration).toContain('GRANT SELECT ON TABLE public.institution_members TO authenticated;');
    expect(migration).not.toContain('TO anon');
  });
});
