import type { Env } from './platform';

type MobileBootstrap = {
  app_user_uid?: string;
  profile?: { user?: Record<string, unknown> };
};

export async function getMobileBootstrap(request: Request, env: Env): Promise<MobileBootstrap | null> {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ') || env.SUPABASE_URL.includes('placeholder')) return null;
  try {
    const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/functions/v1/mobile-firebase-session-v2`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: authorization,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ action: 'bootstrap' }),
    });
    if (!response.ok) return null;
    const payload = await response.json() as MobileBootstrap;
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

export async function getUserId(request: Request, env: Env): Promise<string | null> {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  if (env.SUPABASE_URL.includes('placeholder')) return 'placeholder-user';
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: authorization },
  });
  if (response.ok) {
    const user = await response.json() as { id?: unknown };
    return typeof user?.id === 'string' ? user.id : null;
  }
  const mobile = await getMobileBootstrap(request, env);
  return typeof mobile?.app_user_uid === 'string' ? mobile.app_user_uid : null;
}

export async function getAccountProfile(request: Request, env: Env, userId: string | null): Promise<Record<string, unknown> | null> {
  if (!userId || userId === 'guest' || userId === 'placeholder-user') return null;
  const authorization = request.headers.get('Authorization') || '';
  try {
    const url = `${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/users?uid=eq.${encodeURIComponent(userId)}&select=is_premium,plan_name&limit=1`;
    const response = await fetch(url, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: authorization } });
    if (response.ok) {
      const rows = await response.json() as Array<Record<string, unknown>>;
      if (rows[0]) return rows[0];
    }
  } catch {
    // Firebase tokens are not Supabase Auth JWTs; use the verified mobile bridge.
  }
  const mobile = await getMobileBootstrap(request, env);
  const profile = mobile?.profile?.user;
  return profile && typeof profile === 'object' ? profile : null;
}

export function isPaidCosmoPlan(planName: unknown): boolean {
  const plan = typeof planName === 'string' ? planName.trim().toLowerCase() : '';
  return ['silver', 'gold', 'diamond', 'الفضية', 'الذهبية', 'الماسية'].some(token => plan.includes(token));
}

export async function hasPaidCosmoAccess(request: Request, env: Env, userId: string | null): Promise<boolean> {
  const profile = await getAccountProfile(request, env, userId);
  return Boolean(profile?.is_premium) || isPaidCosmoPlan(profile?.plan_name);
}

export async function getCosmoAccountContext(request: Request, env: Env, userId: string | null): Promise<string> {
  if (!userId || userId === 'guest' || env.SUPABASE_URL.includes('placeholder')) {
    return 'حالة الحساب الموثقة: زائر أو لا توجد جلسة موثقة. لا تفترض وجود باقة أو صلاحيات.';
  }
  const profile = await getAccountProfile(request, env, userId);
  if (!profile) return 'حالة الحساب الموثقة: تعذر قراءة ملف العضوية الآن. لا تخمّن الباقة ولا حالة الحساب.';
  return `حالة الحساب الموثقة من الخادم: المستخدم الحالي فقط. العضوية المفعلة: ${profile.is_premium ? 'نعم' : 'لا'}؛ اسم الباقة: ${profile.plan_name || 'مجانية أو غير محددة'}. لا توجد لك أي صلاحية لتغيير هذه القيم.`;
}
