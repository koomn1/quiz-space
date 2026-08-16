import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workspaceMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260816_institutional_diamond_workspace.sql'),
  'utf8',
);
const idempotencyMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260817_institution_activation_idempotency.sql'),
  'utf8',
);
const hardeningMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260818_harden_institution_function_surface.sql'),
  'utf8',
);

describe('institutional Diamond security contract', () => {
  it('enables RLS for institution records, seats, and audit events', () => {
    expect(workspaceMigration).toContain('ALTER TABLE institutions ENABLE ROW LEVEL SECURITY');
    expect(workspaceMigration).toContain('ALTER TABLE institution_members ENABLE ROW LEVEL SECURITY');
    expect(workspaceMigration).toContain('ALTER TABLE institution_audit_log ENABLE ROW LEVEL SECURITY');
    expect(workspaceMigration).toContain('CREATE POLICY institutions_read_members');
    expect(workspaceMigration).toContain('CREATE POLICY institution_members_read_scoped');
  });

  it('limits seat changes to security-definer RPCs and revokes public execution', () => {
    expect(workspaceMigration).toContain('SECURITY DEFINER');
    expect(workspaceMigration).toContain('REVOKE ALL ON FUNCTION activate_diamond_institution(TEXT, TEXT, INTEGER) FROM PUBLIC');
    expect(workspaceMigration).toContain('REVOKE ALL ON FUNCTION assign_institution_member(UUID, TEXT, TEXT) FROM PUBLIC');
    expect(workspaceMigration).toContain('GRANT EXECUTE ON FUNCTION assign_institution_member(UUID, TEXT, TEXT) TO authenticated');
    expect(workspaceMigration).toContain('IF NOT is_institution_manager(p_institution_id) THEN');
  });

  it('enforces a configured seat ceiling and protects the owner seat', () => {
    expect(idempotencyMigration).toContain('IF v_active_seats >= v_seat_limit THEN');
    expect(idempotencyMigration).toContain("RAISE EXCEPTION 'اكتمل عدد المقاعد المتاحة في المؤسسة'");
    expect(workspaceMigration).toContain("IF v_role = 'owner' THEN");
    expect(workspaceMigration).toContain("RAISE EXCEPTION 'لا يمكن إزالة مالك المؤسسة'");
  });

  it('reuses an active owner workspace instead of creating duplicate institutions', () => {
    expect(idempotencyMigration).toContain('WHERE owner_id = p_owner_user_id AND status = \'active\'');
    expect(idempotencyMigration).toContain('IF v_institution_id IS NULL THEN');
    expect(idempotencyMigration).toContain('UPDATE institutions');
  });

  it('keeps internal authorization helpers off the anonymous RPC surface', () => {
    expect(hardeningMigration).toContain('SET search_path = public');
    expect(hardeningMigration).toContain('REVOKE ALL ON FUNCTION is_institution_manager(UUID) FROM PUBLIC, anon');
    expect(hardeningMigration).toContain('REVOKE ALL ON FUNCTION is_institution_member(UUID) FROM PUBLIC, anon');
    expect(hardeningMigration).toContain('GRANT EXECUTE ON FUNCTION is_institution_manager(UUID) TO authenticated');
  });
});
