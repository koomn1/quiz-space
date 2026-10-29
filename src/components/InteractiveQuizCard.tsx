import React, { useState } from 'react';
import { Quiz } from '../types';
import { Star, Play, Share2, Trash2, Tag, Sparkles, Users, X, Loader2, Download, FileSpreadsheet, Printer, ChevronDown, Eye, CheckCircle2, Settings2 } from 'lucide-react';
import { UserBadge } from './UserBadge';
import { PremiumNameTag } from './PremiumNameTag';
import ParallaxTiltCard from './ParallaxTiltCard';
import { getQuizTakersUnique, getCompletionsByQuizId } from '../lib/db';
import { QuizCompletion } from '../types';
import { createPortal } from 'react-dom';
import { createQuizPdfBytes, downloadQuizPdfBytes, getQuizPdfFileName } from '../lib/quizPdf';
// Keep the modal and print window independent from transformed/overflow-hidden card ancestors.

interface InteractiveQuizCardProps {
  quiz: Quiz;
  idx?: number;
  isAr?: boolean;
  lang?: 'ar' | 'en';
  t?: any;
  currentUserEmail?: string | null | undefined;
  currentUserId?: string | null | undefined;
  onStartQuiz: (quizId: string) => void;
  onShareQuiz?: (quizId: string, quizTitle: string, quizDescription?: string) => void;
  onEditQuiz?: (quiz: Quiz) => void;
  onViewProfile?: (creatorId: string) => void;
  creatorTier?: 'free' | 'premium' | 'enterprise';
  onDeleteClick?: (quizId: string) => void;
  view?: 'grid' | 'list';
  isAdmin?: boolean;
}

export function InteractiveQuizCard({
  quiz,
  idx = 0,
  isAr: isArProp,
  lang,
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
  const isAr = isArProp !== undefined ? isArProp : lang === 'ar';
  const isGuest = !currentUserId || currentUserId.startsWith('user-');
  const canEdit = !isGuest && (isAdminProp || quiz.creatorId === currentUserId);
  const canManageQuizAttempts = canEdit;
  const canViewAttempts = canManageQuizAttempts;
  const [attempts, setAttempts] = useState<QuizCompletion[]>([]);
  const [attemptsOpen, setAttemptsOpen] = useState(false);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfSettingsOpen, setPdfSettingsOpen] = useState(false);
  const [essayAnswerHeight, setEssayAnswerHeight] = useState(120);
  const [pdfTitle, setPdfTitle] = useState(quiz.title);
  const [pdfDescription, setPdfDescription] = useState(quiz.description || '');
  const [pdfStudentName, setPdfStudentName] = useState('');
  const [pdfExamDate, setPdfExamDate] = useState('');
  const [pdfScore, setPdfScore] = useState('');

  const openPdfSettings = () => {
    setExportMenuOpen(false);
    setPdfTitle(quiz.title);
    setPdfDescription(quiz.description || '');
    setPdfStudentName('');
    setPdfExamDate(new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US'));
    setPdfScore('');
    setPdfSettingsOpen(true);
  };

  const downloadPdf = async () => {
    setPdfSettingsOpen(false);
    try {
      const parsedScore = pdfScore.trim() === '' ? null : Number(pdfScore);
      const branding = {
        institutionName: quiz.creatorName || '',
        pdfTitle,
        pdfDescription,
        studentName: pdfStudentName,
        examDate: pdfExamDate,
        score: Number.isFinite(parsedScore) ? parsedScore : null,
        essayAnswerHeight,
      };
      const bytes = await createQuizPdfBytes(quiz, branding);
      downloadQuizPdfBytes(bytes, getQuizPdfFileName(quiz, branding));
    } catch (error) {
      console.error('Quiz PDF export failed:', error);
      window.alert(isAr ? 'تعذر إنشاء ملف PDF حالياً. حاول مرة أخرى.' : 'Could not create the PDF right now. Please try again.');
    }
  };

  const openAttempts = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!canViewAttempts) return;
    setAttemptsOpen(true);
    setAttemptsLoading(true);
    try {
      const res = await getQuizTakersUnique(quiz.id);
      if (res && res.length > 0) {
        setAttempts(res);
      } else {
        const fallback = await getCompletionsByQuizId(quiz.id);
        setAttempts(fallback);
      }
    } catch (err) {
      console.warn('Failed to load quiz attempts:', err);
      try {
        const fallback = await getCompletionsByQuizId(quiz.id);
        setAttempts(fallback);
      } catch (_) {
        setAttempts([]);
      }
    } finally {
      setAttemptsLoading(false);
    }
  };

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest('[data-card-action]')) return;
    onStartQuiz(quiz.id);
  };

  const quizAttemptsButton = (
    <button
      type="button"
      data-card-action="attempts"
      onClick={openAttempts}
      disabled={!canViewAttempts}
      className="inline-flex min-h-11 max-w-full touch-manipulation cursor-pointer select-none active:scale-95 items-center justify-center gap-2 rounded-xl border border-cyan-300/80 bg-gradient-to-r from-cyan-50 to-indigo-50 px-4 py-2.5 text-xs font-black text-indigo-800 shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-cyan-700/70 dark:from-cyan-950/50 dark:to-indigo-950/50 dark:text-cyan-200 sm:text-sm"
      title={isAr ? 'مشاهدة من دخلوا الاختبار' : 'View who took this quiz'}
      aria-label={`${isAr ? 'مشاهدة من دخلوا الاختبار' : 'View who took this quiz'} (${quiz.totalPlays || 0})`}
    >
      <Users className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap">{isAr ? 'مشاهدة من دخلوا الاختبار' : 'View who took this quiz'}</span>
      <span className="min-w-7 rounded-full bg-indigo-100 px-2 py-0.5 text-center text-[11px] font-black text-indigo-800 dark:bg-indigo-900/70 dark:text-cyan-100">
        {quiz.totalPlays || 0}
      </span>
    </button>
  );

  const printQuiz = () => {
    // Open synchronously from the click handler, then wait until the new
    // document has loaded before invoking print. Calling print immediately
    // after document.write can produce a blank print preview on mobile Chrome.
    const printWindow = window.open('about:blank', '_blank');
    if (!printWindow) return;

    const escapeHtml = (value: unknown) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    const questionsHtml = questions.map((question, index) => {
      const options = Array.isArray(question.options) && question.options.length
        ? `<table class="options-table"><tbody>${question.options.map((option, optionIndex) => `<tr><td class="choice-box">□</td><td class="choice-label">${String.fromCharCode(65 + optionIndex)}.</td><td>${escapeHtml(option)}</td></tr>`).join('')}</tbody></table>`
        : `<div class="answer-area"></div>`;
      return `<table class="question-table"><tbody><tr><td class="question-number">${index + 1}</td><td><div class="question-text">${escapeHtml(question.text)}</div>${options}</td></tr></tbody></table>`;
    }).join('');
    const html = `<!doctype html><html lang="${isAr ? 'ar' : 'en'}" dir="${isAr ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${escapeHtml(pdfTitle)}</title><style>
      *{box-sizing:border-box}body{font-family:Arial,"Tahoma",sans-serif;color:#111827;max-width:900px;margin:0 auto;padding:28px;line-height:1.65;background:#fff}header{border-bottom:3px solid #4f46e5;padding-bottom:18px;margin-bottom:18px}h1{font-size:26px;margin:0 0 5px;color:#312e81}p{color:#475569;margin:0 0 18px}.meta{display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;margin:16px 0 22px}.meta div{border:1px solid #cbd5e1;border-radius:8px;min-height:42px;padding:8px 10px;font-size:12px;color:#475569}.meta strong{color:#111827;display:block;font-size:10px;margin-bottom:3px}.meta span{display:block;margin-top:4px}.question-table{width:100%;border-collapse:separate;border-spacing:0;margin:0 0 14px;border:1px solid #cbd5e1;border-radius:10px;overflow:hidden;break-inside:avoid}.question-table td{vertical-align:top}.question-number{width:42px;background:#eef2ff;color:#3730a3;font-size:18px;font-weight:bold;text-align:center;padding:14px 8px;border-left:1px solid #cbd5e1}.question-text{font-size:15px;font-weight:bold;padding:13px 14px 8px}.options-table{width:calc(100% - 28px);border-collapse:collapse;margin:0 14px 13px;font-size:12px}.options-table td{border:1px solid #e2e8f0;padding:7px 8px}.choice-box{width:26px;text-align:center;font-size:18px}.choice-label{width:28px;color:#4f46e5;font-weight:bold}.answer-area{height:${essayAnswerHeight}px;border:1px dashed #94a3b8;border-radius:7px;margin:4px 14px 14px;padding:9px}.footer-note{margin-top:18px;text-align:center;font-size:10px;color:#94a3b8}@media print{body{padding:0;max-width:none}.question-table{break-inside:avoid}header{margin-top:0}.meta div{min-height:38px}}
    </style></head><body><header><h1>${escapeHtml(pdfTitle)}</h1><p>${escapeHtml(pdfDescription)}</p></header><section class="meta"><div><strong>اسم الطالب / Student name</strong><span>${escapeHtml(pdfStudentName || '____________________________')}</span></div><div><strong>الدرجة / Score</strong><span>${escapeHtml(pdfScore || '____')}</span></div><div><strong>التاريخ / Date</strong><span>${escapeHtml(pdfExamDate || '____________________________')}</span></div></section>${questionsHtml}<p class="footer-note">Quiz Space · ${questions.length} questions</p></body></html>`;

    let printed = false;
    const printWhenReady = () => {
      if (printed || printWindow.closed) return;
      printed = true;
      printWindow.focus();
      printWindow.print();
    };
    printWindow.onafterprint = () => printWindow.close();
    printWindow.onload = printWhenReady;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    // Some mobile browsers do not emit load again for document.write().
    window.setTimeout(printWhenReady, 500);
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
    if (!canViewAttempts || attemptsLoading || attempts.length === 0) return;
    const headers = isAr ? ['اسم العضو', 'الدرجة', 'إجمالي الأسئلة', 'تاريخ الحل'] : ['Member', 'Score', 'Total Questions', 'Solved At'];
    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = attempts.map((attempt) => [attempt.takerName, attempt.score, attempt.totalQuestions, attempt.createdAt ? new Date(attempt.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US') : '']);
    const csv = '\ufeff' + [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    downloadFile(`${quiz.title || 'quiz'}-members.csv`, csv, 'text/csv;charset=utf-8');
  };

  const exportAttemptsExcel = () => {
    if (!canViewAttempts || attemptsLoading || attempts.length === 0) return;
    const headers = isAr ? ['اسم العضو', 'الدرجة', 'إجمالي الأسئلة', 'تاريخ الحل'] : ['Member', 'Score', 'Total Questions', 'Solved At'];
    const escapeHtml = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const cells = (row: unknown[]) => row.map((value) => `<td>${escapeHtml(value)}</td>`).join('');
    const rows = attempts.map((attempt) => [attempt.takerName, attempt.score, attempt.totalQuestions, attempt.createdAt ? new Date(attempt.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US') : '']);
    const html = `\ufeff<html><head><meta charset="utf-8"><style>body{font-family:Arial}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px}</style></head><body><h2>${escapeHtml(quiz.title)}</h2><table><thead><tr>${cells(headers)}</tr></thead><tbody>${rows.map((row) => `<tr>${cells(row)}</tr>`).join('')}</tbody></table></body></html>`;
    downloadFile(`${quiz.title || 'quiz'}-members.xls`, html, 'application/vnd.ms-excel;charset=utf-8');
  };

  React.useEffect(() => {
    if (!attemptsOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAttemptsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [attemptsOpen]);

  const attemptsPanel = attemptsOpen && typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md animate-fade-in" onClick={() => setAttemptsOpen(false)} role="dialog" aria-modal="true" aria-labelledby={`attempts-title-${quiz.id}`}>
      <div className="uipro-glass-surface w-full max-w-lg max-h-[min(660px,90vh)] overflow-hidden rounded-[28px] border border-violet-200/80 dark:border-violet-500/20 shadow-2xl" onClick={(e) => e.stopPropagation()} dir={isAr ? 'rtl' : 'ltr'}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-6 py-4.5 dark:border-slate-800/80 bg-gradient-to-r from-violet-500/5 via-primary/5 to-cyan-500/5">
          <div>
            <h3 id={`attempts-title-${quiz.id}`} className="font-display font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>🏆</span>
              <span>{isAr ? 'الأعضاء الذين حلوا الاختبار' : 'Members who solved this quiz'}</span>
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-bold truncate max-w-xs">{quiz.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={exportAttemptsCsv} disabled={attemptsLoading || attempts.length === 0} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-[11px] font-black text-emerald-600 transition-all hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-400" title="CSV"><Download className="h-3.5 w-3.5" />CSV</button>
            <button type="button" onClick={exportAttemptsExcel} disabled={attemptsLoading || attempts.length === 0} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500/10 px-3 py-2 text-[11px] font-black text-blue-600 transition-all hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-blue-400" title="Excel"><FileSpreadsheet className="h-3.5 w-3.5" />Excel</button>
            <button type="button" onClick={() => setAttemptsOpen(false)} className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="max-h-[min(520px,70vh)] overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {attemptsLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-xs font-bold text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>{isAr ? 'جاري تحميل قائمة الأبطال والحلول...' : 'Loading quiz solvers list...'}</span>
            </div>
          ) : attempts.length === 0 ? (
            <div className="py-16 text-center text-xs font-bold text-slate-400">
              <span className="text-3xl block mb-2">🎯</span>
              <span>{isAr ? 'لا توجد محاولات مسجلة بعد — كُن أول من يحل هذا الاختبار!' : 'No recorded attempts yet — be the first to solve it!'}</span>
            </div>
          ) : (
            <div className="space-y-2">
              {attempts.map((attempt, aIdx) => {
                const medal = aIdx === 0 ? '🥇' : aIdx === 1 ? '🥈' : aIdx === 2 ? '🥉' : `#${aIdx + 1}`;
                const pct = attempt.totalQuestions > 0 ? Math.round((attempt.score / attempt.totalQuestions) * 100) : 100;
                return (
                  <div key={attempt.id || aIdx} className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-900/60 hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-7 text-center font-black text-xs text-slate-400 select-none">{medal}</span>
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 text-primary dark:text-primary-light flex items-center justify-center font-black text-xs border border-primary/20">
                        {attempt.takerName ? attempt.takerName.slice(0, 1) : '👤'}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-900 dark:text-slate-100">{attempt.takerName || (isAr ? 'زائر متميز' : 'Member')}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">{attempt.createdAt ? new Date(attempt.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 px-2.5 py-1 text-xs font-black font-mono text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">{pct}%</span>
                      <span className="rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-black text-primary font-mono">{attempt.score}/{attempt.totalQuestions}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  const pdfSettingsPanel = pdfSettingsOpen && typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-md" onClick={() => setPdfSettingsOpen(false)} role="dialog" aria-modal="true" aria-labelledby={`pdf-settings-title-${quiz.id}`}>
      <div className="uipro-glass-surface flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-violet-200/80 shadow-2xl dark:border-violet-500/20" onClick={(event) => event.stopPropagation()} dir={isAr ? 'rtl' : 'ltr'}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 bg-gradient-to-r from-violet-500/10 via-primary/5 to-cyan-500/10 px-5 py-4 dark:border-slate-800/80">
          <div><h3 id={`pdf-settings-title-${quiz.id}`} className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-white"><Settings2 className="h-5 w-5 text-violet-500" />{isAr ? 'معاينة وتجهيز التصدير' : 'Export preview & setup'}</h3><p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{isAr ? 'راجع البيانات، ثم اختر إنشاء PDF أو الطباعة.' : 'Review the information, then create the PDF or print it.'}</p></div>
          <button type="button" onClick={() => setPdfSettingsOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={isAr ? 'إغلاق' : 'Close'}><X className="h-4 w-4" /></button>
        </div>
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_250px]">
          <div className="space-y-3">
            <div><label className="mb-1 block text-xs font-black text-slate-700 dark:text-slate-200">{isAr ? 'اسم الاختبار' : 'Quiz title'}</label><input value={pdfTitle} onChange={(event) => setPdfTitle(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white" /></div>
            <div><label className="mb-1 block text-xs font-black text-slate-700 dark:text-slate-200">{isAr ? 'وصف الاختبار' : 'Quiz description'}</label><textarea value={pdfDescription} onChange={(event) => setPdfDescription(event.target.value)} rows={3} className="w-full resize-y rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm font-medium leading-6 text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs font-black text-slate-700 dark:text-slate-200">{isAr ? 'اسم الطالب' : 'Student name'}</label><input value={pdfStudentName} onChange={(event) => setPdfStudentName(event.target.value)} placeholder={isAr ? 'يُترك فارغًا للكتابة اليدوية' : 'Leave blank for handwriting'} className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white" /></div>
              <div><label className="mb-1 block text-xs font-black text-slate-700 dark:text-slate-200">{isAr ? 'التاريخ' : 'Date'}</label><input value={pdfExamDate} onChange={(event) => setPdfExamDate(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white" /></div>
            </div>
            <div><label className="mb-1 block text-xs font-black text-slate-700 dark:text-slate-200">{isAr ? 'الدرجة (اختياري)' : 'Score (optional)'}</label><input type="number" min={0} max={quiz.questions.length} value={pdfScore} onChange={(event) => setPdfScore(event.target.value)} placeholder={`____ / ${quiz.questions.length}`} className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white" /></div>
          </div>
          <aside className="rounded-2xl border border-violet-200/70 bg-violet-50/70 p-4 dark:border-violet-500/20 dark:bg-violet-950/20">
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">{isAr ? 'مساحة إجابة المقالي' : 'Essay answer space'}</h4>
            <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-400">{isAr ? 'الاسم يظهر فوق الخط، والمساحة أسفل السؤال للكتابة.' : 'The name appears above its line; this space is below each essay question.'}</p>
            <div className="mt-4 flex items-center gap-2"><input type="number" min={56} max={320} step={8} value={essayAnswerHeight} onChange={(event) => setEssayAnswerHeight(Math.min(320, Math.max(56, Number(event.target.value) || 56)))} className="w-20 rounded-xl border border-violet-200 bg-white px-2 py-1.5 text-center text-sm font-black text-violet-700 outline-none dark:border-violet-700 dark:bg-slate-900 dark:text-violet-300" /><span className="text-[10px] font-bold text-slate-500">pt</span></div>
            <input aria-label={isAr ? 'ارتفاع مساحة إجابة المقال' : 'Essay answer height'} type="range" min={56} max={320} step={8} value={essayAnswerHeight} onChange={(event) => setEssayAnswerHeight(Number(event.target.value))} className="mt-4 w-full accent-violet-600" />
            <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-400"><span>56</span><span>120</span><span>320</span></div>
            <button type="button" onClick={() => setEssayAnswerHeight(120)} className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">{isAr ? 'إعادة الافتراضي' : 'Reset default'}</button>
          </aside>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-200/80 p-4 dark:border-slate-800/80">
          <button type="button" onClick={printQuiz} className="flex-1 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs font-black text-violet-700 hover:bg-violet-100 dark:border-violet-700/50 dark:bg-violet-950/30 dark:text-violet-300"><Printer className="me-1 inline h-4 w-4" />{isAr ? 'معاينة الطباعة' : 'Print preview'}</button>
          <button type="button" onClick={downloadPdf} className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-violet-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-primary/20"><Download className="me-1 inline h-4 w-4" />{isAr ? 'إنشاء PDF' : 'Create PDF'}</button>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;
  const previewPanel = previewOpen && typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setPreviewOpen(false)} role="dialog" aria-modal="true" aria-labelledby={`quiz-preview-title-${quiz.id}`}>
      <div className="uipro-glass-surface max-h-[min(760px,92vh)] w-full max-w-2xl overflow-hidden rounded-[28px] border border-violet-200 dark:border-violet-500/20 shadow-2xl" onClick={(event) => event.stopPropagation()} dir={isAr ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-indigo-50 px-5 py-4 dark:border-slate-800 dark:from-violet-950/40 dark:to-indigo-950/30">
          <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">{isAr ? 'معاينة الاختبار' : 'Quiz preview'}</p><h3 id={`quiz-preview-title-${quiz.id}`} className="mt-1 text-lg font-black text-slate-900 dark:text-white">{quiz.title}</h3></div>
          <button type="button" onClick={() => setPreviewOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-white/70 dark:hover:bg-slate-800" aria-label={isAr ? 'إغلاق المعاينة' : 'Close preview'}><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[calc(min(760px,92vh)-80px)] overflow-y-auto p-5">
          <div className="mb-5 grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-violet-500/10 p-3"><p className="text-[10px] font-bold text-slate-500">{isAr ? 'الأسئلة' : 'Questions'}</p><p className="mt-1 text-lg font-black text-violet-600">{quiz.questions.length}</p></div><div className="rounded-2xl bg-amber-500/10 p-3"><p className="text-[10px] font-bold text-slate-500">{isAr ? 'التقييم' : 'Rating'}</p><p className="mt-1 text-lg font-black text-amber-600">{quiz.ratingsCount ? `${quiz.avgRating} ★` : '—'}</p></div><div className="rounded-2xl bg-emerald-500/10 p-3"><p className="text-[10px] font-bold text-slate-500">{isAr ? 'المحاولات' : 'Plays'}</p><p className="mt-1 text-lg font-black text-emerald-600">{quiz.totalPlays || 0}</p></div></div>
          {quiz.description && <p className="mb-5 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-600 dark:bg-slate-900 dark:text-slate-300">{quiz.description}</p>}
          <div className="space-y-3">{quiz.questions.slice(0, 3).map((question, index) => <div key={question.id || index} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-xs font-black text-white">{index + 1}</span><div className="min-w-0 flex-1"><p className="font-bold leading-7 text-slate-800 dark:text-slate-100">{question.text}</p>{Array.isArray(question.options) && question.options.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{question.options.slice(0, 4).map((option, optionIndex) => <span key={`${option}-${optionIndex}`} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300"><span className="font-black text-violet-500">{String.fromCharCode(65 + optionIndex)}</span>{option}</span>)}</div>}{question.type === 'essay' && <span className="mt-3 inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-600"><CheckCircle2 className="h-3 w-3" />{isAr ? 'سؤال مقالي' : 'Essay question'}</span>}</div></div></div>)}</div>
          {quiz.questions.length > 3 && <p className="mt-4 text-center text-xs font-bold text-slate-500">{isAr ? `تظهر أول 3 أسئلة فقط في المعاينة — إجمالي ${quiz.questions.length} سؤالاً.` : `Showing the first 3 questions — ${quiz.questions.length} questions total.`}</p>}
          <button type="button" onClick={() => { setPreviewOpen(false); onStartQuiz(quiz.id); }} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-violet-500 py-3.5 text-sm font-black text-white shadow-lg shadow-primary/20"><Play className="h-4 w-4 fill-white" />{isAr ? 'ابدأ الاختبار الآن' : 'Start quiz now'}</button>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  if (view === 'list') {
    return (
      <>
      <ParallaxTiltCard
        idx={idx}
        onClick={handleCardClick}
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
              {canManageQuizAttempts ? quizAttemptsButton : (
                <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-bold" aria-label={isAr ? `لُعب ${quiz.totalPlays || 0} مرة` : `Played ${quiz.totalPlays || 0} times`}><Users className="mr-0.5 inline h-3 w-3" />{t?.playedTimes?.replace('{count}', String(quiz.totalPlays || 0)) || (isAr ? `لُعب ${quiz.totalPlays || 0} مرة` : `Played ${quiz.totalPlays || 0} times`)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right section: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 justify-end mt-2 md:mt-0">
          <div data-card-action="export" className="relative flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
              setExportMenuOpen((open) => !open);
              }
            }
            className="p-1.5 w-8 h-8 flex items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/60 transition-colors cursor-pointer border border-violet-200/60 dark:border-violet-800/50"
            title={isAr ? 'تحويل إلى PDF أو طباعة' : 'Export PDF or print'}
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
          {exportMenuOpen && (
            <div data-card-action="export" className="absolute end-0 bottom-full mb-2 z-[90] w-44 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900" dir={isAr ? 'rtl' : 'ltr'}>
              <button type="button" onClick={openPdfSettings} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-slate-700 hover:bg-violet-50 dark:text-slate-200 dark:hover:bg-violet-950/40"><Eye className="h-4 w-4 text-violet-500" />{isAr ? 'معاينة الاختبار' : 'Preview quiz'}</button>
              <button type="button" onClick={openPdfSettings} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-slate-700 hover:bg-violet-50 dark:text-slate-200 dark:hover:bg-violet-950/40"><Download className="h-4 w-4 text-violet-500" />{isAr ? 'تصدير PDF احترافي' : 'Export professional PDF'}</button>
              <button type="button" onClick={openPdfSettings} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-slate-700 hover:bg-violet-50 dark:text-slate-200 dark:hover:bg-violet-950/40"><Printer className="h-4 w-4 text-violet-500" />{isAr ? 'طباعة' : 'Print'}</button>
            </div>
          )}
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
    {pdfSettingsPanel}
    {previewPanel}
      </>
    );
  }

  return (
    <>
    <ParallaxTiltCard
      idx={idx}
      onClick={handleCardClick}
      className="uipro-clay-card rounded-[28px] duration-300 ease-out flex flex-col justify-between overflow-hidden group relative cursor-pointer"
    >
      {/* Soft Specular Light Highlight on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-cyan-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none -z-10 rounded-[28px]"></div>
      
      {/* Inner Card Content Wrapper */}
      <div className="h-full w-full p-6 sm:p-7 flex flex-col justify-between z-10 relative">
        <div className="space-y-4" style={{ transform: 'translateZ(20px)', transformStyle: 'preserve-3d' }}>
        
        {/* Header: Badges & Rating */}
        <div className="flex items-center justify-between gap-3 flex-row-reverse" dir="ltr">
          <div className="flex items-center gap-1.5 flex-row-reverse flex-wrap">
            <span className="uipro-pill-badge bg-primary/10 text-primary dark:text-primary-light border border-primary/15 font-black">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{quiz.questions.length} {t?.questionsCount || (isAr ? 'أسئلة' : 'Questions')}</span>
            </span>
            {quiz.category && (
              <span className="uipro-pill-badge text-violet-600 dark:text-violet-300 bg-violet-500/10 dark:bg-violet-950/40 border border-violet-500/20">
                <Tag className="w-3 h-3" />
                <span>{quiz.category}</span>
              </span>
            )}
          </div>
          
          {/* Rating Block */}
          {quiz.ratingsCount > 0 ? (
            <div className="uipro-pill-badge text-amber-500 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span>{quiz.avgRating} ({quiz.ratingsCount})</span>
            </div>
          ) : (
            <span className="uipro-pill-badge text-slate-400 bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">{t?.unrated || (isAr ? 'جديد' : 'New')}</span>
          )}
        </div>

        {/* Info */}
        <div className="space-y-2 block" style={{ textAlign: isAr ? 'right' : 'left' }}>
          <h4 className="font-display font-black text-lg text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors duration-200 leading-snug">
            {quiz.title}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 font-medium">
            {quiz.description || (isAr ? 'اختبار تفاعلي مميز لقياس مهاراتك ومعارفك في هذا المجال.' : 'An interactive knowledge challenge to test your skills.')}
          </p>

          {/* Elegant metadata line placed cleanly under description */}
          <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] text-slate-400 dark:text-slate-500 font-bold" dir={isAr ? 'rtl' : 'ltr'}>
            <span className="text-slate-400 font-medium">{t?.byCreator || (isAr ? 'بواسطة' : 'by')}</span>
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
                className="font-black text-slate-700 dark:text-slate-300"
              />
            </span>
            <span className="text-slate-300 dark:text-slate-700 select-none">•</span>
            {canManageQuizAttempts ? quizAttemptsButton : (
              <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-bold" aria-label={isAr ? `لُعب ${quiz.totalPlays || 0} مرة` : `Played ${quiz.totalPlays || 0} times`}><Users className="h-3.5 w-3.5" /><span>{t?.playedTimes?.replace('{count}', String(quiz.totalPlays || 0)) || (isAr ? `لُعب ${quiz.totalPlays || 0} مرة` : `Played ${quiz.totalPlays || 0} times`)}</span></span>
            )}
          </div>
        </div>

      </div>

      {/* Clean, spacious action footer */}
      <div 
        className="relative border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-5 flex flex-wrap items-center justify-between gap-x-2 gap-y-3 w-full"
        style={{ transform: 'translateZ(15px)' }}
      >
        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShareQuiz(quiz.id, quiz.title, quiz.description);
            }}
            className="p-2 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-primary dark:text-slate-300 dark:hover:text-primary hover:scale-105 hover:bg-slate-200/80 transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
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
                  className="p-2 w-9 h-9 flex items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 hover:bg-amber-100/50 transition-all hover:scale-105 cursor-pointer border border-amber-200/40 dark:border-amber-800/30"
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
                  className="p-2 w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-350 hover:bg-red-100/50 transition-all hover:scale-105 cursor-pointer border border-red-200/40 dark:border-red-800/30"
                  title={t?.deleteTooltip || (isAr ? 'حذف' : 'Delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        <div data-card-action="export" className="relative flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExportMenuOpen((open) => !open);
            }}
            className="flex shrink-0 whitespace-nowrap items-center justify-center gap-1.5 px-3 h-10 rounded-xl bg-violet-100/80 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-black text-xs transition-all hover:scale-105 cursor-pointer border border-violet-200/70 dark:border-violet-800/50"
            title={isAr ? 'تحويل إلى PDF أو طباعة' : 'Export PDF or print'}
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">{isAr ? 'PDF / طباعة' : 'PDF'}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {exportMenuOpen && (
            <div data-card-action="export" className="absolute end-0 bottom-full mb-2 z-[90] w-48 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95" dir={isAr ? 'rtl' : 'ltr'}>
              <button type="button" onClick={openPdfSettings} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-slate-700 hover:bg-violet-50 dark:text-slate-200 dark:hover:bg-violet-950/40"><Eye className="h-4 w-4 text-violet-500" />{isAr ? 'معاينة الاختبار' : 'Preview quiz'}</button>
              <button type="button" onClick={openPdfSettings} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-slate-700 hover:bg-violet-50 dark:text-slate-200 dark:hover:bg-violet-950/40"><Download className="h-4 w-4 text-violet-500" />{isAr ? 'تصدير PDF احترافي' : 'Export professional PDF'}</button>
              <button type="button" onClick={openPdfSettings} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-slate-700 hover:bg-violet-50 dark:text-slate-200 dark:hover:bg-violet-950/40"><Printer className="h-4 w-4 text-violet-500" />{isAr ? 'طباعة' : 'Print'}</button>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartQuiz(quiz.id);
            }}
            className="uipro-btn-tactile group/play flex grow shrink-0 whitespace-nowrap items-center justify-center gap-2 px-5 h-10 rounded-xl bg-gradient-to-r from-primary to-violet-600 hover:from-primary-hover hover:to-violet-500 text-white font-black text-xs shadow-md shadow-primary/25 hover:shadow-primary/45 cursor-pointer relative overflow-hidden"
          >
            <span>{t?.startPlayBtn || (isAr ? 'ابدأ التحدي' : 'Start Play')}</span>
            <Play className={`w-3.5 h-3.5 fill-white ${isAr ? '' : 'rotate-180'} group-hover/play:scale-115 transition-transform`} />
          </button>
        </div>
      </div>
      </div>
    </ParallaxTiltCard>
    {attemptsPanel}
    {pdfSettingsPanel}
    {previewPanel}
    </>
  );
}
