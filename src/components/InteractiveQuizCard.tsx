import React, { useState } from 'react';
import { Quiz } from '../types';
import { Star, Play, Share2, Trash2, Tag, Sparkles, Users, X, Loader2, Download, FileSpreadsheet } from 'lucide-react';
import { UserBadge } from './UserBadge';
import { PremiumNameTag } from './PremiumNameTag';
import ParallaxTiltCard from './ParallaxTiltCard';
import { getCompletionsByQuizId } from '../lib/db';
import { QuizCompletion } from '../types';

interface InteractiveQuizCardProps {
  quiz: Quiz;
  idx: number;
  isAr: boolean;
  t: any;
  currentUserEmail: string | null | undefined;
  currentUserId: string | null | undefined;
  onStartQuiz: (quizId: string) => void;
  onShareQuiz: (quizId: string, quizTitle: string, quizDescription?: string) => void;
  onEditQuiz?: (quiz: Quiz) => void;
  onViewProfile?: (creatorId: string) => void;
  creatorTier?: 'free' | 'premium' | 'enterprise';
  onDeleteClick?: (quizId: string) => void;
  view?: 'grid' | 'list';
  isAdmin?: boolean;
}

export function InteractiveQuizCard({
  quiz,
  idx,
  isAr,
  t,
  currentUserEmail,
  currentUserId,
  onStartQuiz,
  onShareQuiz,
  onEditQuiz,
  onViewProfile,
  creatorTier = 'free',
  onDeleteClick,
  view = 'grid',
  isAdmin: isAdminProp = false
}: InteractiveQuizCardProps) {
  const isGuest = !currentUserId || currentUserId.startsWith('user-');
  const canEdit = !isGuest && (
    isAdminProp ||
    currentUserEmail === 'yo01009950871@gmail.com' || 
    currentUserEmail === 'adman777888999@gmail.com' || 
    quiz.creatorId === currentUserId
  );
  const [attempts, setAttempts] = useState<QuizCompletion[]>([]);
  const [attemptsOpen, setAttemptsOpen] = useState(false);
  const [attemptsLoading, setAttemptsLoading] = useState(false);

  const openAttempts = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!canEdit) return;
    setAttemptsOpen(true);
    setAttemptsLoading(true);
    try {
      setAttempts(await getCompletionsByQuizId(quiz.id));
    } finally {
      setAttemptsLoading(false);
    }
  };

  const downloadFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const exportAttemptsCsv = () => {
    if (!canEdit || attemptsLoading || attempts.length === 0) return;
    const headers = isAr ? ['اسم العضو', 'الدرجة', 'إجمالي الأسئلة', 'تاريخ الحل'] : ['Member', 'Score', 'Total Questions', 'Solved At'];
    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = attempts.map((attempt) => [attempt.takerName, attempt.score, attempt.totalQuestions, attempt.createdAt ? new Date(attempt.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US') : '']);
    const csv = '\ufeff' + [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    downloadFile(`${quiz.title || 'quiz'}-members.csv`, csv, 'text/csv;charset=utf-8');
  };

  const exportAttemptsExcel = () => {
    if (!canEdit || attemptsLoading || attempts.length === 0) return;
    const headers = isAr ? ['اسم العضو', 'الدرجة', 'إجمالي الأسئلة', 'تاريخ الحل'] : ['Member', 'Score', 'Total Questions', 'Solved At'];
    const escapeHtml = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const cells = (row: unknown[]) => row.map((value) => `<td>${escapeHtml(value)}</td>`).join('');
    const rows = attempts.map((attempt) => [attempt.takerName, attempt.score, attempt.totalQuestions, attempt.createdAt ? new Date(attempt.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US') : '']);
    const html = `\ufeff<html><head><meta charset="utf-8"><style>body{font-family:Arial}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px}</style></head><body><h2>${escapeHtml(quiz.title)}</h2><table><thead><tr>${cells(headers)}</tr></thead><tbody>${rows.map((row) => `<tr>${cells(row)}</tr>`).join('')}</tbody></table></body></html>`;
    downloadFile(`${quiz.title || 'quiz'}-members.xls`, html, 'application/vnd.ms-excel;charset=utf-8');
  };

  const attemptsPanel = attemptsOpen ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setAttemptsOpen(false)}>
      <div className="w-full max-w-lg max-h-[min(640px,90vh)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" onClick={(e) => e.stopPropagation()} dir={isAr ? 'rtl' : 'ltr'}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div><h3 className="font-black text-slate-800 dark:text-white">{isAr ? 'الأعضاء الذين حلوا الاختبار' : 'Members who solved this quiz'}</h3><p className="mt-1 text-xs text-slate-500">{quiz.title}</p></div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={exportAttemptsCsv} disabled={attemptsLoading || attempts.length === 0} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-[11px] font-black text-emerald-600 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-400" title="CSV"><Download className="h-3.5 w-3.5" />CSV</button>
            <button type="button" onClick={exportAttemptsExcel} disabled={attemptsLoading || attempts.length === 0} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500/10 px-3 py-2 text-[11px] font-black text-blue-600 transition-colors hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-blue-400" title="Excel"><FileSpreadsheet className="h-3.5 w-3.5" />Excel</button>
            <button type="button" onClick={() => setAttemptsOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="max-h-[min(520px,70vh)] overflow-y-auto p-4">
          {attemptsLoading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{isAr ? 'جاري تحميل الأعضاء...' : 'Loading members...'}</div> : attempts.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">{isAr ? 'لا توجد محاولات مسجلة بعد.' : 'No recorded attempts yet.'}</p> : <div className="space-y-2">{attempts.map((attempt) => <div key={attempt.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50"><div><p className="font-bold text-slate-800 dark:text-slate-100">{attempt.takerName || (isAr ? 'عضو' : 'Member')}</p><p className="text-[11px] text-slate-500">{attempt.createdAt ? new Date(attempt.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US') : ''}</p></div><span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-black text-primary">{attempt.score}/{attempt.totalQuestions}</span></div>)}</div>}
        </div>
      </div>
    </div>
  ) : null;

  if (view === 'list') {
    return (
      <>
      <ParallaxTiltCard
        idx={idx}
        onClick={() => onStartQuiz(quiz.id)}
        className="glass-card hover:border-primary/45 dark:hover:border-primary/50 p-4 rounded-[20px] hover:shadow-[0_12px_24px_rgba(99,102,241,0.06)] hover:scale-[1.015] duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-hidden relative"
      >
        <div className="absolute -inset-[1px] rounded-[20px] bg-gradient-to-r from-primary/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 pointer-events-none" />
        <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4">
          {/* Left section: Rating & Category Badge */}
          <div className="flex md:flex-col items-center md:items-start gap-1.5 shrink-0 min-w-[120px]">
            {quiz.ratingsCount > 0 ? (
              <div className="flex items-center gap-1 text-[11px] text-amber-500 bg-amber-500/5 dark:bg-amber-950/20 px-2 py-0.5 rounded-lg font-bold border border-amber-500/10">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span>{quiz.avgRating} ({quiz.ratingsCount})</span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-2 py-0.5 rounded-md font-bold">{t?.unrated || (isAr ? 'لم يقيّم' : 'Unrated')}</span>
            )}
            {quiz.category && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-violet-500 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-lg">
                <Tag className="w-2.5 h-2.5" />
                {quiz.category}
              </span>
            )}
          </div>

          {/* Middle section: Title, description, creator name */}
          <div className="flex-1 space-y-1 text-right md:text-left" style={{ textAlign: isAr ? 'right' : 'left' }}>
            <h4 className="font-display font-black text-base text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors duration-200">
              {quiz.title}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal line-clamp-1">
              {quiz.description || (isAr ? 'لم يتم كتابة وصف.' : 'No description.')}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 font-bold justify-end md:justify-start">
              <span>{t?.byCreator || (isAr ? 'بواسطة' : 'by')}</span>
              <span
                onClick={(e) => { e.stopPropagation(); onViewProfile && quiz.creatorId && onViewProfile(quiz.creatorId); }}
                className="cursor-pointer hover:underline"
              >
                <PremiumNameTag
                  name={quiz.creatorName}
                  isPremium={!!quiz.creatorBadgeTier && quiz.creatorBadgeTier !== 'none'}
                  badgeTier={quiz.creatorBadgeTier as any}
                  nameColor={quiz.creatorNameColor as any}
                  badgeColor={quiz.creatorBadgeColor as any}
                  badgeSize="sm"
                  className="font-black text-slate-500 dark:text-slate-350"
                />
              </span>
              <span>•</span>
              <button type="button" onClick={openAttempts} disabled={!canEdit} className={canEdit ? 'cursor-pointer text-primary hover:underline' : 'cursor-default'} title={canEdit ? (isAr ? 'عرض الأعضاء الذين حلوا الاختبار' : 'View members who solved it') : undefined}><Users className="mr-0.5 inline h-3 w-3" />{t?.playedTimes?.replace('{count}', String(quiz.totalPlays || 0)) || (isAr ? `لُعب ${quiz.totalPlays || 0} مرة` : `Played ${quiz.totalPlays || 0} times`)}</button>
            </div>
          </div>
        </div>

        {/* Right section: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 justify-end mt-2 md:mt-0">
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShareQuiz(quiz.id, quiz.title, quiz.description);
              }}
              className="p-1.5 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary transition-colors cursor-pointer border border-slate-200/50 dark:border-slate-700"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            {canEdit && (
              <>
                {onEditQuiz && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditQuiz(quiz);
                    }}
                    className="p-1.5 w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 hover:text-amber-700 transition-colors cursor-pointer border border-amber-200/40 dark:border-amber-800/30"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </button>
                )}
                {onDeleteClick && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteClick(quiz.id);
                    }}
                    className="p-1.5 w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 hover:text-red-700 transition-colors cursor-pointer border border-red-200/40 dark:border-red-800/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartQuiz(quiz.id);
            }}
            className="flex items-center justify-center gap-1 px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-primary to-primary-hover rounded-xl shadow-md shadow-primary/10 hover:scale-103 transition-transform cursor-pointer"
          >
            <span>{t?.startPlayBtn || (isAr ? 'ابدأ اللعب' : 'Start Play')}</span>
            <Play className={`w-3 h-3 fill-white ${isAr ? '' : 'rotate-180'}`} />
          </button>
        </div>
      </ParallaxTiltCard>
      {attemptsPanel}
      </>
    );
  }

  return (
    <>
    <ParallaxTiltCard
      idx={idx}
      onClick={() => onStartQuiz(quiz.id)}
      className="glass-card hover:border-primary/35 p-[1px] rounded-[24px] hover:shadow-[0_18px_42px_-18px_rgba(99,102,241,0.22)] hover:scale-[1.015] dark:hover:shadow-[0_18px_42px_-18px_rgba(124,58,237,0.28)] duration-500 ease-out flex flex-col justify-between overflow-hidden group relative"
    >
      {/* Animated Gradient Border */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/55 via-violet-500/45 to-cyan-400/35 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out rounded-[24px] pointer-events-none -z-20"></div>
      
      {/* Inner Card Content Wrapper */}
      <div className="bg-white/95 dark:bg-[#090d16]/95 backdrop-blur-xl h-full w-full rounded-[23px] p-6 flex flex-col justify-between z-10 relative overflow-hidden transition-colors duration-300">
        
        {/* Ambient glowing background on hover inside */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 pointer-events-none" 
        />
        
        <div className="space-y-4" style={{ transform: 'translateZ(25px)', transformStyle: 'preserve-3d' }}>
        
        {/* Header: Title or Badge */}
        <div className="flex items-start justify-between gap-3 flex-row-reverse" dir="ltr" style={{ transform: 'translateZ(30px)' }}>
          <div className="flex items-center gap-1.5 flex-row-reverse flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
              <Sparkles className="w-3.5 h-3.5" />
              {quiz.questions.length} {t?.questionsCount || (isAr ? 'أسئلة' : 'Questions')}
            </span>
            {quiz.category && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-violet-500 dark:text-violet-400 bg-violet-500/10 dark:bg-violet-950/40 px-2.5 py-1 rounded-lg border border-violet-500/10 dark:border-violet-900/40">
                <Tag className="w-3 h-3" />
                {quiz.category}
              </span>
            )}
          </div>
          
          {/* Rating Block */}
          {quiz.ratingsCount > 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/5 dark:bg-amber-950/20 px-2.5 py-1 rounded-lg font-bold border border-amber-500/10 dark:border-amber-500/5">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{quiz.avgRating} ({quiz.ratingsCount} {t?.ratingLabel || (isAr ? 'تقييم' : 'Ratings')})</span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-2 py-0.5 rounded-md font-bold">{t?.unrated || (isAr ? 'غير مقيّم' : 'Unrated')}</span>
          )}
        </div>

        {/* Info */}
        <div className="space-y-2 block" style={{ textAlign: isAr ? 'right' : 'left', transform: 'translateZ(35px)' }}>
          <h4 className="font-display font-black text-lg text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors duration-200 leading-tight">
            {quiz.title}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
            {quiz.description || (isAr ? 'لم يتم كتابة وصف توضيحي تفصيلي لهذا الاختبار العام.' : 'No detailed description written for this public quiz.')}
          </p>

          {/* Elegant metadata line placed cleanly under description */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 text-[10.5px] text-slate-450 dark:text-slate-500 font-bold" dir={isAr ? 'rtl' : 'ltr'}>
            <span>{t?.byCreator || (isAr ? 'بواسطة' : 'by')}</span>
            <span
              onClick={(e) => { e.stopPropagation(); onViewProfile && quiz.creatorId && onViewProfile(quiz.creatorId); }}
              className="cursor-pointer hover:underline hover:text-primary transition-all"
            >
              <PremiumNameTag
                name={quiz.creatorName}
                isPremium={!!quiz.creatorBadgeTier && quiz.creatorBadgeTier !== 'none'}
                badgeTier={quiz.creatorBadgeTier as any}
                nameColor={quiz.creatorNameColor as any}
                badgeColor={quiz.creatorBadgeColor as any}
                badgeSize="sm"
                className="font-black text-slate-600 dark:text-slate-350"
              />
            </span>
            <span className="text-slate-300 dark:text-slate-700 font-normal select-none">•</span>
            <button type="button" onClick={openAttempts} disabled={!canEdit} className={canEdit ? 'cursor-pointer text-primary hover:underline' : 'cursor-default'} title={canEdit ? (isAr ? 'عرض الأعضاء الذين حلوا الاختبار' : 'View members who solved it') : undefined}><Users className="mr-0.5 inline h-3 w-3" />{t?.playedTimes?.replace('{count}', String(quiz.totalPlays || 0)) || (isAr ? `لُعب ${quiz.totalPlays || 0} مرة` : `Played ${quiz.totalPlays || 0} times`)}</button>
          </div>
        </div>

      </div>

      {/* Clean, spacious action footer that NEVER overflows horizontally */}
      <div 
        className="border-t border-slate-100 dark:border-slate-800/60 pt-4 mt-5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 w-full"
        style={{ transform: 'translateZ(20px)', transformStyle: 'preserve-3d' }}
      >
        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap" style={{ transform: 'translateZ(10px)' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShareQuiz(quiz.id, quiz.title, quiz.description);
            }}
            className="p-2 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-700 hover:text-primary dark:text-slate-300 dark:hover:text-primary hover:scale-105 hover:bg-slate-200 transition-all cursor-pointer border border-slate-200/50 dark:border-slate-700"
            title={t?.shareTooltip || (isAr ? 'مشاركة' : 'Share')}
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Admin/Creator Edit and Delete controls */}
          {canEdit && (
            <>
              {onEditQuiz && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditQuiz(quiz);
                  }}
                  className="p-2 w-9 h-9 flex items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-all hover:scale-105 cursor-pointer border border-amber-200/40 dark:border-amber-800/30"
                  title={t?.editTooltip || (isAr ? 'تعديل' : 'Edit')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                </button>
              )}
              {onDeleteClick && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick(quiz.id);
                  }}
                  className="p-2 w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30 text-red-655 hover:text-red-750 dark:text-red-400 dark:hover:text-red-350 hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-all hover:scale-105 cursor-pointer border border-red-200/40 dark:border-red-800/30"
                  title={t?.deleteTooltip || (isAr ? 'حذف' : 'Delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartQuiz(quiz.id);
          }}
          className="group/play flex items-center justify-center gap-1.5 px-5 h-10 rounded-xl bg-gradient-to-r from-primary to-violet-500 hover:from-primary-hover hover:to-violet-400 text-white font-black text-xs transition-all hover:scale-105 duration-300 shadow-md shadow-primary/20 hover:shadow-primary/40 cursor-pointer active:scale-95 overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/play:translate-y-0 transition-transform duration-300" />
          <span className="relative z-10">{t?.startPlayBtn || (isAr ? 'ابدأ اللعب' : 'Start Play')}</span>
          <Play className={`relative z-10 w-3.5 h-3.5 fill-white ${isAr ? '' : 'rotate-180'} group-hover/play:scale-110 transition-transform`} />
        </button>
      </div>
      </div>
    </ParallaxTiltCard>
    {attemptsPanel}
    </>
  );
}
