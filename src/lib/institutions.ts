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

export interface InstitutionLearningGapStudent {
  studentId: string;
  studentName: string | null;
  studentPhotoUrl: string | null;
}

export interface InstitutionLearningGap {
  studentId: string;
  studentName: string | null;
  studentPhotoUrl: string | null;
  category: string;
  quizzesTaken: number;
  averageScore: number;
  masteryPercent: number;
  gapLevel: 'priority' | 'watch' | 'strong';
  latestCompletionAt: string | null;
}

export interface InstitutionExportBrand {
  institutionId: string;
  institutionName: string;
  primaryColor: string | null;
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

export async function getInstitutionLearningGapStudents(institutionId: string): Promise<InstitutionLearningGapStudent[]> {
  ensureConfigured();
  const { data, error } = await supabase.rpc('get_institution_learning_gap_students', {
    p_institution_id: institutionId,
  });
  if (error) throw new Error(error.message || 'تعذر تحميل طلاب التحليل.');
  return (data || []).map((row: any) => ({
    studentId: row.student_id,
    studentName: row.student_name || null,
    studentPhotoUrl: row.student_photo_url || null,
  }));
}

export async function getInstitutionLearningGaps(
  institutionId: string,
  studentId?: string | null,
): Promise<InstitutionLearningGap[]> {
  ensureConfigured();
  const { data, error } = await supabase.rpc('get_institution_learning_gaps', {
    p_institution_id: institutionId,
    p_student_id: studentId || null,
  });
  if (error) throw new Error(error.message || 'تعذر تحميل تحليلات الفجوات.');
  return (data || []).map((row: any) => ({
    studentId: row.student_id,
    studentName: row.student_name || null,
    studentPhotoUrl: row.student_photo_url || null,
    category: row.category || 'غير مصنف',
    quizzesTaken: Number(row.quizzes_taken || 0),
    averageScore: Number(row.average_score || 0),
    masteryPercent: Math.max(0, Math.min(100, Number(row.mastery_percent || 0))),
    gapLevel: row.gap_level === 'priority' || row.gap_level === 'watch' ? row.gap_level : 'strong',
    latestCompletionAt: row.latest_completion_at || null,
  }));
}

export async function getInstitutionExportBrandForQuiz(quizId: string): Promise<InstitutionExportBrand | null> {
  ensureConfigured();
  const { data, error } = await supabase.rpc('get_institution_export_brand_for_quiz', {
    p_quiz_id: quizId,
  });
  if (error) throw new Error(error.message || 'تعذر تحميل هوية التصدير المؤسسي.');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.institution_id || !row?.institution_name) return null;
  const configuredColor = typeof row.branding?.primaryColor === 'string' ? row.branding.primaryColor : null;
  return {
    institutionId: row.institution_id,
    institutionName: row.institution_name,
    primaryColor: configuredColor && /^#[0-9a-fA-F]{6}$/.test(configuredColor) ? configuredColor : null,
  };
}
