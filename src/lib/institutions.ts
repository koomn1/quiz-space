import { isSupabaseConfigured, supabase } from './supabaseClient';

export type InstitutionMemberRole = 'owner' | 'manager' | 'teacher';
export type InstitutionMemberStatus = 'active' | 'revoked';

export interface Institution {
  id: string;
  name: string;
  ownerId: string;
  planId: 'diamond';
  seatLimit: number;
  status: 'active' | 'suspended' | 'cancelled';
  branding: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface InstitutionMember {
  id: string;
  institutionId: string;
  userId: string;
  role: InstitutionMemberRole;
  status: InstitutionMemberStatus;
  addedBy: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    uid: string;
    name: string | null;
    email: string | null;
    photo_url: string | null;
  } | null;
}

const mapInstitution = (row: any): Institution => ({
  id: row.id,
  name: row.name,
  ownerId: row.owner_id,
  planId: 'diamond',
  seatLimit: Number(row.seat_limit || 15),
  status: row.status,
  branding: row.branding || {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapMember = (row: any): InstitutionMember => ({
  id: row.id,
  institutionId: row.institution_id,
  userId: row.user_id,
  role: row.role,
  status: row.status,
  addedBy: row.added_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  user: Array.isArray(row.user) ? row.user[0] || null : row.user || null,
});

function ensureConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('قاعدة البيانات غير متاحة حالياً. حاول مرة أخرى بعد اتصال المنصة.');
  }
}

export async function getMyInstitutions(): Promise<Institution[]> {
  ensureConfigured();
  const { data, error } = await supabase
    .from('institutions')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw new Error('تعذر تحميل بيانات المؤسسة.');
  return (data || []).map(mapInstitution);
}

export async function getInstitutionMembers(institutionId: string): Promise<InstitutionMember[]> {
  ensureConfigured();
  const { data, error } = await supabase
    .from('institution_members')
    .select('*, user:users!institution_members_user_id_fkey(uid, name, email, photo_url)')
    .eq('institution_id', institutionId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });
  if (error) throw new Error('تعذر تحميل مقاعد المعلمين.');
  return (data || []).map(mapMember);
}

export async function activateDiamondInstitution(ownerUserId: string, institutionName: string, seatLimit = 15): Promise<string> {
  ensureConfigured();
  const { data, error } = await supabase.rpc('activate_diamond_institution', {
    p_owner_user_id: ownerUserId,
    p_institution_name: institutionName.trim(),
    p_seat_limit: seatLimit,
  });
  if (error || !data) throw new Error(error?.message || 'تعذر تفعيل مساحة المؤسسة.');
  return data as string;
}

export async function provisionMyDiamondInstitution(): Promise<string | null> {
  ensureConfigured();
  const { data, error } = await supabase.rpc('provision_my_diamond_institution');
  if (!error && data) return data as string;

  const message = error?.message || '';
  if (message.includes('الباقة الماسية النشطة فقط')) return null;
  throw new Error(message || 'تعذر تفعيل مساحة المؤسسة.');
}

export async function assignInstitutionMember(institutionId: string, email: string, role: Exclude<InstitutionMemberRole, 'owner'>): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc('assign_institution_member', {
    p_institution_id: institutionId,
    p_member_email: email.trim(),
    p_role: role,
  });
  if (error) throw new Error(error.message || 'تعذر إضافة المعلم للمؤسسة.');
}

export async function revokeInstitutionMember(institutionId: string, memberUserId: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc('revoke_institution_member', {
    p_institution_id: institutionId,
    p_member_user_id: memberUserId,
  });
  if (error) throw new Error(error.message || 'تعذر تحرير المقعد.');
}

export async function saveInstitutionBranding(institutionId: string, name: string, branding: Record<string, unknown>): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc('update_institution_branding', {
    p_institution_id: institutionId,
    p_name: name.trim(),
    p_branding: branding,
  });
  if (error) throw new Error(error.message || 'تعذر حفظ بيانات المؤسسة.');
}
