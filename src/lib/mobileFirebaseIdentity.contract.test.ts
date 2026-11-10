import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('mobile Firebase identity linking', () => {
  const baseMigration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20261110213014_persist_mobile_firebase_identity_links.sql'),
    'utf8',
  );
  const uniquenessMigration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20261110213500_prevent_duplicate_mobile_identity_links.sql'),
    'utf8',
  );
  const lockingMigration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20261110214000_lock_mobile_identity_email_resolution.sql'),
    'utf8',
  );
  const edge = readFileSync(
    resolve(process.cwd(), 'supabase/functions/mobile-firebase-session-v2/index.ts'),
    'utf8',
  );

  it('stores Firebase UID to app UID links in a private service-role-only table', () => {
    expect(baseMigration).toContain('mobile_firebase_identity_links');
    expect(baseMigration).toContain('PRIMARY KEY (firebase_project_id,firebase_uid)');
    expect(baseMigration).toContain('UNIQUE (firebase_project_id,app_user_uid)');
    expect(baseMigration).toContain('ENABLE ROW LEVEL SECURITY');
    expect(baseMigration).toContain('FROM PUBLIC, anon, authenticated');
    expect(baseMigration).toContain('TO service_role');
  });

  it('rejects ambiguous legacy email matches and generates UUID app IDs for new users', () => {
    expect(baseMigration).toContain('ambiguous_legacy_email');
    expect(baseMigration).toContain('gen_random_uuid()::TEXT');
    expect(baseMigration).toContain("'app_user_uid'");
    expect(uniquenessMigration).toContain('app_user_uid=v_app_uid');
    expect(uniquenessMigration).toContain("RAISE EXCEPTION 'identity_conflict'");
  });

  it('serializes first-time linking by Firebase UID and verified email', () => {
    expect(lockingMigration).toContain('hashtextextended(trim(p_firebase_project_id)');
    expect(lockingMigration).toContain("hashtextextended('verified-email:' || v_email,0)");
  });

  it('uses the server identity RPC instead of repeated client-side email matching', () => {
    const start = edge.indexOf('async function resolveQuizSpaceUid(');
    const end = edge.indexOf('async function loadProfile', start);
    const resolver = edge.slice(start, end);
    expect(resolver).toContain('resolve_mobile_firebase_identity');
    expect(resolver).not.toContain('.from("users")');
    expect(resolver).not.toContain('.ilike("email"');
    expect(edge).toContain('message === "ambiguous_legacy_email"');
    expect(edge).toContain('message === "identity_conflict"');
  });
});
