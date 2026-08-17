import React from 'react';
import { AlertCircle, Building2, CheckCircle2, Crown, DoorOpen, LoaderCircle, ShieldCheck, Sparkles, UserPlus, Users } from 'lucide-react';
import {
  assignInstitutionMember,
  getInstitutionMembers,
  getMyInstitutions,
  Institution,
  InstitutionMember,
  InstitutionMemberRole,
  provisionMyDiamondInstitution,
  revokeInstitutionMember,
  saveInstitutionBranding,
} from '../lib/institutions';

interface InstitutionWorkspaceProps {
  userId: string;
  lang: 'ar' | 'en';
  onOpenBilling: () => void;
}

const roleLabels: Record<InstitutionMemberRole, { ar: string; en: string }> = {
  owner: { ar: 'مالك المؤسسة', en: 'Institution owner' },
  manager: { ar: 'مدير', en: 'Manager' },
  teacher: { ar: 'معلم', en: 'Teacher' },
};

export default function InstitutionWorkspace({ userId, lang, onOpenBilling }: InstitutionWorkspaceProps) {
  const isAr = lang === 'ar';
  const [institution, setInstitution] = React.useState<Institution | null>(null);
  const [members, setMembers] = React.useState<InstitutionMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<Exclude<InstitutionMemberRole, 'owner'>>('teacher');
  const [busy, setBusy] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState('');
  const [colorDraft, setColorDraft] = React.useState('#2563eb');

  const loadWorkspace = React.useCallback(async () => {
    if (!userId || userId.startsWith('user-')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let institutions = await getMyInstitutions();
      let active = institutions.find((item) => item.status === 'active') || null;
      if (!active) {
        const provisionedInstitutionId = await provisionMyDiamondInstitution();
        if (provisionedInstitutionId) {
          institutions = await getMyInstitutions();
          active = institutions.find((item) => item.id === provisionedInstitutionId && item.status === 'active') || null;
        }
      }
      setInstitution(active);
      if (!active) {
        setMembers([]);
        return;
      }
      setNameDraft(active.name);
      const primaryColor = typeof active.branding.primaryColor === 'string' ? active.branding.primaryColor : '#2563eb';
      setColorDraft(primaryColor);
      setMembers(await getInstitutionMembers(active.id));
    } catch (caught: any) {
      setError(caught?.message || (isAr ? 'تعذر تحميل مساحة المؤسسة.' : 'Unable to load your institution workspace.'));
    } finally {
      setLoading(false);
    }
  }, [isAr, userId]);

  React.useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const myMember = members.find((member) => member.userId === userId);
  const canManage = myMember?.role === 'owner' || myMember?.role === 'manager';
  const seatLimit = institution?.seatLimit || 15;
  const seatsRemaining = Math.max(0, seatLimit - members.length);

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!institution || !canManage || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await assignInstitutionMember(institution.id, email, role);
      setEmail('');
      await loadWorkspace();
    } catch (caught: any) {
      setError(caught?.message || (isAr ? 'تعذر إضافة المعلم.' : 'Unable to add the teacher.'));
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (member: InstitutionMember) => {
    if (!institution || !canManage || member.role === 'owner') return;
    const approved = window.confirm(isAr ? `هل تريد تحرير مقعد ${member.user?.name || member.user?.email || 'هذا المستخدم'}؟` : `Free the seat currently held by ${member.user?.name || member.user?.email || 'this user'}?`);
    if (!approved) return;
    setBusy(true);
    setError(null);
    try {
      await revokeInstitutionMember(institution.id, member.userId);
      await loadWorkspace();
    } catch (caught: any) {
      setError(caught?.message || (isAr ? 'تعذر تحرير المقعد.' : 'Unable to free this seat.'));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveBranding = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!institution || !canManage || !nameDraft.trim()) return;
    if (!/^#[0-9a-fA-F]{6}$/.test(colorDraft)) {
      setError(isAr ? 'اختر لوناً صحيحاً.' : 'Choose a valid colour.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveInstitutionBranding(institution.id, nameDraft, { primaryColor: colorDraft });
      await loadWorkspace();
    } catch (caught: any) {
      setError(caught?.message || (isAr ? 'تعذر حفظ هوية المؤسسة.' : 'Unable to save institution identity.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <section className="flex min-h-[58vh] items-center justify-center" aria-live="polite"><LoaderCircle className="h-8 w-8 animate-spin text-blue-600" /></section>;
  }

  if (!userId || userId.startsWith('user-')) {
    return <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950" dir={isAr ? 'rtl' : 'ltr'}><ShieldCheck className="mx-auto h-10 w-10 text-blue-600" /><h1 className="mt-4 text-2xl font-black text-slate-900 dark:text-white">{isAr ? 'سجّل الدخول أولاً' : 'Sign in first'}</h1><p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{isAr ? 'تظهر مساحة المؤسسة لأعضاء المؤسسات المفعّلين فقط.' : 'The institution workspace is available only to active institution members.'}</p></section>;
  }

  if (!institution) {
    return (
      <section className="mx-auto max-w-3xl py-8" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="rounded-3xl border border-blue-100 bg-white p-7 shadow-sm dark:border-blue-950/60 dark:bg-slate-950 sm:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"><Building2 className="h-7 w-7" /></div>
          <h1 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">{isAr ? 'مساحة المؤسسة غير مفعّلة لهذا الحساب' : 'No institution workspace is active for this account'}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">{isAr ? 'بعد اعتماد الباقة الماسية من الإدارة، ستظهر هنا إدارة المعلمين والمقاعد وهوية المدرسة.' : 'After Diamond is approved by the administrator, this page will show teacher seats, access, and school identity.'}</p>
          <button type="button" onClick={onOpenBilling} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"><Crown className="h-4 w-4" />{isAr ? 'عرض باقة المؤسسات' : 'View institution plan'}</button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6 py-2 sm:py-5" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-7" style={{ borderTopColor: colorDraft, borderTopWidth: 4 }}>
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-800 dark:bg-blue-500/10 dark:text-blue-200"><Crown className="h-3.5 w-3.5" />{isAr ? 'Diamond للمؤسسات' : 'Diamond for institutions'}</div>
            <h1 className="mt-3 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">{institution.name}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{isAr ? 'إدارة الفريق والمقاعد وصلاحيات الوصول من مكان واحد.' : 'Manage your team, seats, and access from one place.'}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center dark:bg-slate-900"><p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{isAr ? 'المقاعد المستخدمة' : 'Seats used'}</p><p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{members.length}<span className="text-base text-slate-400"> / {seatLimit}</span></p></div>
        </div>
      </header>

      {error && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-950 dark:text-white">{isAr ? 'فريق المؤسسة' : 'Institution team'}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isAr ? `${seatsRemaining} مقاعد متاحة من أصل ${seatLimit}.` : `${seatsRemaining} available out of ${seatLimit} seats.`}</p></div><Users className="h-5 w-5 text-blue-700 dark:text-blue-300" /></div>
          <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
            {members.map((member) => <div key={member.id} className="flex items-center gap-3 py-3 first:pt-0"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 font-black text-slate-600 dark:bg-slate-800 dark:text-slate-200">{member.user?.photo_url ? <img src={member.user.photo_url} alt="" className="h-full w-full object-cover" /> : (member.user?.name || member.user?.email || '?').slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-900 dark:text-white">{member.user?.name || (isAr ? 'مستخدم QuizSpace' : 'QuizSpace user')}</p><p className="truncate text-xs text-slate-500 dark:text-slate-400">{member.user?.email || member.userId}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">{roleLabels[member.role][isAr ? 'ar' : 'en']}</span>{canManage && member.role !== 'owner' && <button type="button" disabled={busy} onClick={() => handleRevoke(member)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-950/30" aria-label={isAr ? 'تحرير المقعد' : 'Free seat'} title={isAr ? 'تحرير المقعد' : 'Free seat'}><DoorOpen className="h-4 w-4" /></button>}</div>)}
          </div>
        </section>

        <div className="space-y-5">
          {canManage && <form onSubmit={handleInvite} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-blue-700 dark:text-blue-300" /><h2 className="font-black text-slate-950 dark:text-white">{isAr ? 'إضافة معلم' : 'Add a teacher'}</h2></div><label className="mt-4 block text-xs font-black text-slate-700 dark:text-slate-200">{isAr ? 'بريد المعلم المسجل' : 'Registered teacher email'}</label><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-blue-900" placeholder="teacher@example.com" /><label className="mt-3 block text-xs font-black text-slate-700 dark:text-slate-200">{isAr ? 'الصلاحية' : 'Access level'}</label><select value={role} onChange={(event) => setRole(event.target.value as Exclude<InstitutionMemberRole, 'owner'>)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-blue-900"><option value="teacher">{isAr ? 'معلم' : 'Teacher'}</option><option value="manager">{isAr ? 'مدير' : 'Manager'}</option></select><button type="submit" disabled={busy || seatsRemaining <= 0} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"><UserPlus className="h-4 w-4" />{seatsRemaining <= 0 ? (isAr ? 'كل المقاعد مستخدمة' : 'All seats are used') : (isAr ? 'إضافة للمؤسسة' : 'Add to institution')}</button></form>}
          {canManage && <form onSubmit={handleSaveBranding} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-blue-700 dark:text-blue-300" /><h2 className="font-black text-slate-950 dark:text-white">{isAr ? 'هوية المؤسسة' : 'Institution identity'}</h2></div><label className="mt-4 block text-xs font-black text-slate-700 dark:text-slate-200">{isAr ? 'اسم المؤسسة' : 'Institution name'}</label><input required minLength={2} maxLength={120} value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-blue-900" /><label className="mt-3 flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-200"><span>{isAr ? 'لون الهوية' : 'Brand colour'}</span><input aria-label={isAr ? 'لون الهوية' : 'Brand colour'} type="color" value={colorDraft} onChange={(event) => setColorDraft(event.target.value)} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent" /></label><button type="submit" disabled={busy} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-800 transition hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200 dark:hover:bg-blue-950/50"><CheckCircle2 className="h-4 w-4" />{isAr ? 'حفظ الهوية' : 'Save identity'}</button></form>}
        </div>
      </div>
    </section>
  );
}
