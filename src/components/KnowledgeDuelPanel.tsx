import React from 'react';
import { CheckCircle2, Copy, RefreshCw, ShieldCheck, Swords, TimerReset, Trophy, UsersRound } from 'lucide-react';
import { createPrivateKnowledgeDuel, getPrivateKnowledgeDuelState, joinPrivateKnowledgeDuel, submitPrivateKnowledgeDuelAnswer } from '../lib/db';
import type { KnowledgeDuelState } from '../types';

type KnowledgeDuelPanelProps = { lang: 'ar' | 'en' };

const copy = {
  ar: {
    eyebrow: 'منافسة اختيارية', title: 'مبارزة معرفية خاصة', subtitle: 'شارك فقط برضاك. يحصل اللاعبان على نفس الأسئلة، ولا تظهر أي درجات أو أسماء للعامة.', create: 'أنشئ دعوة جديدة', creating: 'جاري التجهيز…', join: 'انضم بدعوة', code: 'رمز الدعوة', joinNow: 'انضم الآن', waiting: 'بانتظار لاعب ثانٍ', share: 'أرسل هذا الرمز لصديقك', copied: 'تم النسخ', refresh: 'تحديث الحالة', active: 'المبارزة بدأت', question: 'السؤال', next: 'إجابة', yourProgress: 'تقدمك', opponentFinished: 'الخصم أنهى إجاباته', result: 'النتيجة الخاصة', win: 'أحسنت، تفوقت في هذه الجولة.', tie: 'تعادل جميل، أداء متقارب.', loss: 'انتهت الجولة. راجع الحلول وحاول مرة أخرى.', expired: 'انتهت صلاحية الدعوة. أنشئ دعوة جديدة.', safety: 'حد يومي: ثلاث دعوات. لا نقاط أو عملات للمبارزة، لذلك لا يمكن استخدامها لاستغلال المكافآت.', failure: 'تعذر إكمال العملية الآن. حاول مرة أخرى.',
  },
  en: {
    eyebrow: 'Opt-in competition', title: 'Private knowledge duel', subtitle: 'Join only when you choose to. Both players receive the same questions, and no scores or names are public.', create: 'Create a new invite', creating: 'Preparing…', join: 'Join with an invite', code: 'Invite code', joinNow: 'Join now', waiting: 'Waiting for a second player', share: 'Share this code with a friend', copied: 'Copied', refresh: 'Refresh status', active: 'The duel is active', question: 'Question', next: 'Submit answer', yourProgress: 'Your progress', opponentFinished: 'Your opponent has finished', result: 'Private result', win: 'Well done—you led this round.', tie: 'A close tie. Great work.', loss: 'The round is complete. Review and try again.', expired: 'The invite expired. Create a new one.', safety: 'Daily limit: three invites. Duels give no points or coins, so rewards cannot be exploited.', failure: 'The operation could not be completed. Please try again.',
  },
} as const;

export default function KnowledgeDuelPanel({ lang }: KnowledgeDuelPanelProps) {
  const t = copy[lang];
  const [state, setState] = React.useState<KnowledgeDuelState | null>(null);
  const [duelId, setDuelId] = React.useState('');
  const [inviteCode, setInviteCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [copied, setCopied] = React.useState(false);

  const refresh = React.useCallback(async (id = duelId) => {
    if (!id) return;
    setBusy(true); setMessage('');
    try { setState(await getPrivateKnowledgeDuelState(id)); } catch { setMessage(t.failure); } finally { setBusy(false); }
  }, [duelId, t.failure]);

  const create = async () => {
    setBusy(true); setMessage('');
    const result = await createPrivateKnowledgeDuel();
    setBusy(false);
    if (!result?.duelId) { setMessage(result?.message || t.failure); return; }
    setDuelId(result.duelId); setInviteCode(result.inviteCode); await refresh(result.duelId);
  };
  const join = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setMessage('');
    const result = await joinPrivateKnowledgeDuel(inviteCode);
    setBusy(false);
    if (!result?.duelId) { setMessage(result?.message || t.failure); return; }
    setDuelId(result.duelId); await refresh(result.duelId);
  };
  const answer = async (value: string) => {
    if (!duelId || !state?.round) return;
    setBusy(true); setMessage('');
    const result = await submitPrivateKnowledgeDuelAnswer(duelId, state.round.sequence, value);
    setBusy(false);
    if (!result?.accepted) { setMessage(result?.message || t.failure); return; }
    await refresh();
  };
  const copyCode = async () => { if (!inviteCode) return; await navigator.clipboard?.writeText(inviteCode); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };

  const resultText = state?.result?.outcome === 'win' ? t.win : state?.result?.outcome === 'tie' ? t.tie : t.loss;
  return <section className="mx-auto max-w-4xl space-y-5" aria-labelledby="duel-heading"><header className="rounded-[2rem] border border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-600/15 via-violet-600/15 to-cyan-500/10 p-6"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-600 dark:text-fuchsia-300">{t.eyebrow}</p><h2 id="duel-heading" className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white"><Swords className="h-6 w-6 text-fuchsia-500" />{t.title}</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">{t.subtitle}</p><p className="mt-4 flex gap-2 rounded-xl bg-white/65 p-3 text-xs font-bold leading-6 text-slate-600 dark:bg-slate-950/35 dark:text-slate-300"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{t.safety}</p></header>
    {!duelId && <div className="grid gap-4 md:grid-cols-2"><div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><UsersRound className="h-6 w-6 text-violet-500" /><h3 className="mt-3 text-sm font-black text-slate-900 dark:text-white">{t.create}</h3><button type="button" onClick={() => void create()} disabled={busy} className="mt-4 min-h-11 w-full rounded-xl bg-violet-600 px-4 text-xs font-black text-white hover:bg-violet-500 disabled:opacity-60">{busy ? t.creating : t.create}</button></div><form onSubmit={join} className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><TimerReset className="h-6 w-6 text-cyan-500" /><h3 className="mt-3 text-sm font-black text-slate-900 dark:text-white">{t.join}</h3><label className="mt-4 block text-xs font-bold text-slate-600 dark:text-slate-300">{t.code}<input required value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 font-mono text-sm font-black tracking-[0.2em] text-slate-900 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label><button disabled={busy || inviteCode.length !== 8} className="mt-4 min-h-11 w-full rounded-xl bg-cyan-500 px-4 text-xs font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-60">{t.joinNow}</button></form></div>}
    {message && <p role="alert" className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-bold text-amber-700 dark:text-amber-200">{message}</p>}
    {duelId && state && <div className="rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-7"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div>{inviteCode && <><p className="text-xs font-bold text-slate-500">{t.share}</p><button type="button" onClick={() => void copyCode()} className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-3 font-mono text-lg font-black tracking-[0.18em] text-slate-900 dark:bg-slate-950 dark:text-white">{inviteCode}<Copy className="h-4 w-4" />{copied && <span className="font-sans text-[10px] tracking-normal text-emerald-500">{t.copied}</span>}</button></>}</div><button type="button" onClick={() => void refresh()} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-xs font-black text-slate-700 dark:border-slate-700 dark:text-slate-200"><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />{t.refresh}</button></div>
      {state.status === 'waiting' && <div className="mt-6 rounded-2xl bg-amber-500/10 p-5 text-center text-sm font-black text-amber-700 dark:text-amber-200"><TimerReset className="mx-auto mb-2 h-6 w-6" />{t.waiting}</div>}
      {state.status === 'expired' && <div className="mt-6 rounded-2xl bg-slate-100 p-5 text-center text-sm font-black text-slate-600 dark:bg-slate-950 dark:text-slate-300">{t.expired}</div>}
      {state.status === 'active' && <div className="mt-6"><div className="flex items-center justify-between text-xs font-bold text-slate-500"><span>{t.yourProgress}</span><span>{state.answeredCount}/{state.questionCount}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500" style={{ width: `${(state.answeredCount / Math.max(1, state.questionCount)) * 100}%` }} /></div>{state.opponentFinished && <p className="mt-4 rounded-xl bg-cyan-500/10 p-3 text-xs font-bold text-cyan-700 dark:text-cyan-200">{t.opponentFinished}</p>}{state.round && <article className="mt-6 rounded-2xl border border-fuchsia-300/25 bg-fuchsia-500/5 p-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-600 dark:text-fuchsia-300">{t.question} {state.round.sequence}</p><h3 className="mt-3 text-lg font-black text-slate-900 dark:text-white">{lang === 'ar' ? state.round.promptAr : state.round.promptEn}</h3><div className="mt-5 grid gap-3 sm:grid-cols-2">{state.round.options.map((option) => <button key={option} type="button" disabled={busy} onClick={() => void answer(option)} className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 transition hover:border-fuchsia-400 hover:bg-fuchsia-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-fuchsia-950/30">{option}</button>)}</div></article>}</div>}
      {state.status === 'completed' && state.result && <div className="mt-6 rounded-2xl bg-emerald-500/10 p-6 text-center"><Trophy className="mx-auto h-8 w-8 text-emerald-500" /><h3 className="mt-3 text-lg font-black text-slate-900 dark:text-white">{t.result}</h3><p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">{resultText}</p><p className="mt-4 text-2xl font-black text-emerald-600 dark:text-emerald-300">{state.result.myScore} / {state.questionCount}</p></div>}
    </div>}
  </section>;
}
