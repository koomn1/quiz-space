import { readFileSync } from 'node:fs';

/**
 * The historical per-file migrations were consolidated into a single baseline
 * (see supabase/MIGRATION_GUIDE.md). Each original file is preserved verbatim
 * inside the baseline under an "-- >>> ORIGIN: supabase/migrations/<name>"
 * marker. Contract tests read individual migrations through this helper so
 * their assertions stay scoped to exactly the original migration content.
 */
const BASELINE = readFileSync(
  new URL('../../supabase/migrations/20260728_consolidated_baseline.sql', import.meta.url),
  'utf8',
);

const ORIGIN_MARKER_RE = /^-- >>> ORIGIN: (supabase\/migrations\/[^\n]+)$/gm;

export function migrationSql(originPath: string): string {
  const markers: { path: string; index: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = ORIGIN_MARKER_RE.exec(BASELINE)) !== null) {
    markers.push({ path: match[1], index: match.index });
  }
  const target = markers.find(marker => marker.path === originPath);
  if (!target) {
    throw new Error(`Migration '${originPath}' not found in the consolidated baseline`);
  }
  const next = markers.find(marker => marker.index > target.index);
  return BASELINE.slice(target.index, next ? next.index : BASELINE.length);
}
