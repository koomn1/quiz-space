import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PendingEssayReview } from '../types';
import { getPendingEssayReviews, gradeQuizEssayAttempt } from '../lib/db';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Sparkles,
  BookOpen,
  Send,
  HelpCircle,
  FileText
} from 'lucide-react';

interface EssayReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizId?: string;
  quizTitle?: string;
  lang?: 'ar' | 'en';
  onGraded?: () => void;
}

export function EssayReviewModal({
  isOpen,
  onClose,
  quizId,
  quizTitle,
  lang = 'ar',
  onGraded
}: EssayReviewModalProps) {
  const isAr = lang === 'ar';
  const [reviews, setReviews] = useState<PendingEssayReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);

  // Grading form state for active review
  const [awardedScore, setAwardedScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const data = await getPendingEssayReviews(quizId);
      setReviews(data);
      if (data.length > 0 && !activeReviewId) {
        setActiveReviewId(data[0].completionId);
        setAwardedScore(data[0].score);
        setFeedback(data[0].creatorFeedback || '');
      }
    } catch (err) {
      console.error('Failed to load pending reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void fetchReviews();
    } else {
      setActiveReviewId(null);
      setActionSuccess(null);
      setActionError(null);
    }
  }, [isOpen, quizId]);

  const activeReview = reviews.find((r) => r.completionId === activeReviewId);

  // When active review changes, initialize the awarded score with their current objective score
  useEffect(() => {
    if (activeReview) {
      setAwardedScore(activeReview.score);
      setFeedback(activeReview.creatorFeedback || '');
      setActionError(null);
      setActionSuccess(null);
    }
  }, [activeReviewId]);

  const handleGradeSubmit = async () => {
    if (!activeReview) return;
    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const success = await gradeQuizEssayAttempt(
        activeReview.completionId,
        activeReview.isGuest,
        awardedScore,
        feedback.trim()
      );
      if (success) {
        setActionSuccess(isAr ? 'تم اعتماد وتحديث نتيجة الطالب بنجاح! ✨' : 'Grading submitted successfully! ✨');
        // Remove from local list
        setReviews((prev) => prev.filter((r) => r.completionId !== activeReview.completionId));
        onGraded?.();
        // Switch to next available review
        const remaining = reviews.filter((r) => r.completionId !== activeReview.completionId);
        if (remaining.length > 0) {
          setActiveReviewId(remaining[0].completionId);
        } else {
          setActiveReviewId(null);
        }
      } else {
        setActionError(isAr ? 'تعذر حفظ التقييم. تحقق من الصلاحيات والاتصال.' : 'Failed to save grade.');
      }
    } catch (err: any) {
      console.error('Submit review error:', err);
      setActionError(err?.message || (isAr ? 'حدث خطأ أثناء رصد الدرجة.' : 'An error occurred.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-4xl max-h-[min(780px,92vh)] overflow-hidden rounded-[28px] border border-violet-300/60 dark:border-violet-500/30 bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-6 py-4.5 dark:border-slate-800/80 bg-gradient-to-r from-violet-500/10 via-primary/5 to-amber-500/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-lg border border-amber-500/20">
              ✍️
            </div>
            <div>
              <h3 className="font-display font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isAr ? 'مراجعة وتصحيح الأسئلة المقالية' : 'Essay Questions Review & Grading'}</span>
                {reviews.length > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-black text-amber-700 dark:text-amber-300">
                    {reviews.length} {isAr ? 'معلقة' : 'pending'}
                  </span>
                )}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-bold truncate max-w-md">
                {quizTitle || (isAr ? 'رصد درجات الطلاب واعتماد نتائج الاختبارات اليدوية' : 'Review and grade student written submissions')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20 text-xs font-bold text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <span>{isAr ? 'جاري تحميل قائمة الطلاب والإجابات المقالية...' : 'Loading pending student answers...'}</span>
            </div>
          ) : reviews.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl">
                🎉
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-800 dark:text-slate-100">
                  {isAr ? 'رائع! لا توجد إجابات مقالية بانتظار المراجعة' : 'All Caught Up! No pending essay reviews'}
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  {isAr
                    ? 'تم تصحيح واعتماد جميع إجابات الطلاب المقالية بنجاح لهذا الاختبار.'
                    : 'All student submissions have been reviewed and finalized.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Left Column / Solvers List */}
              <div className="w-full md:w-72 border-b md:border-b-0 md:border-inline-end border-slate-200/80 dark:border-slate-800/80 overflow-y-auto max-h-48 md:max-h-none p-3 space-y-2 shrink-0 bg-slate-50/50 dark:bg-slate-950/20">
                <div className="text-[11px] font-black uppercase text-slate-400 px-2 py-1">
                  {isAr ? 'قائمة الطلاب المنتظرين:' : 'Waiting Students:'}
                </div>
                {reviews.map((rev) => {
                  const isSelected = rev.completionId === activeReviewId;
                  return (
                    <button
                      key={rev.completionId}
                      type="button"
                      onClick={() => setActiveReviewId(rev.completionId)}
                      className={`w-full text-right p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? 'border-violet-500 bg-violet-500/10 dark:bg-violet-950/30 text-violet-900 dark:text-violet-100 shadow-xs'
                          : 'border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-violet-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs truncate max-w-[140px]">{rev.takerName}</span>
                        <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {rev.score}/{rev.totalQuestions}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="truncate max-w-[120px]">{rev.quizTitle}</span>
                        <span>
                          {rev.createdAt
                            ? new Date(rev.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
                                month: 'numeric',
                                day: 'numeric',
                              })
                            : ''}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right Column / Grading Workspace */}
              {activeReview ? (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                  {/* Solver banner */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 to-primary/10 border border-violet-200/60 dark:border-violet-800/40">
                    <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>👤</span>
                        <span>{activeReview.takerName}</span>
                        {activeReview.isGuest && (
                          <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full font-normal">
                            {isAr ? 'زائر' : 'Guest'}
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {isAr ? 'الاختبار:' : 'Quiz:'} <span className="font-bold text-slate-700 dark:text-slate-300">{activeReview.quizTitle}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-400 block">{isAr ? 'الدرجة الحالية (موضوعي):' : 'Objective score:'}</span>
                      <span className="text-base font-black font-mono text-primary">
                        {activeReview.score} / {activeReview.totalQuestions}
                      </span>
                    </div>
                  </div>

                  {/* Essay Questions List */}
                  <div className="space-y-4">
                    <h5 className="font-black text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-violet-500" />
                      <span>{isAr ? 'الأسئلة المقالية وإجابات الطالب:' : 'Essay Questions & Student Answers:'}</span>
                    </h5>

                    {activeReview.questions
                      .map((q, idx) => ({ q, idx }))
                      .filter(({ q }) => q.type === 'essay')
                      .map(({ q, idx }, essayOrder) => {
                        const answersRecord = activeReview.essayAnswers as any;
                        const studentAnswer =
                          (answersRecord && (answersRecord[idx] || answersRecord[String(idx)])) ||
                          (Array.isArray(answersRecord) && answersRecord[idx]) ||
                          '';

                        return (
                          <div
                            key={q.id || idx}
                            className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3.5 shadow-sm"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-xs font-black text-white">
                                {essayOrder + 1}
                              </span>
                              <p className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-relaxed">
                                {q.text}
                              </p>
                            </div>

                            {/* Student Answer Box */}
                            <div className="p-3.5 rounded-xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 space-y-1.5">
                              <span className="text-[10px] font-black text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 rounded inline-block">
                                {isAr ? 'إجابة الطالب المكتوبة:' : 'Student Written Answer:'}
                              </span>
                              <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-medium">
                                {studentAnswer || (
                                  <span className="italic text-slate-400">
                                    {isAr ? 'لم يقم الطالب بكتابة إجابة على هذا السؤال.' : 'No answer provided.'}
                                  </span>
                                )}
                              </p>
                            </div>

                            {/* Model Answer (Teacher reference) */}
                            {q.correctAnswer && (
                              <details className="text-xs">
                                <summary className="cursor-pointer font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                                  {isAr ? '👁️ عرض الإجابة النموذجية الاسترشادية' : '👁️ View Model Answer'}
                                </summary>
                                <div className="mt-2 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-200 leading-relaxed font-semibold">
                                  {q.correctAnswer}
                                </div>
                              </details>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Grading Inputs */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-violet-200/80 dark:border-violet-800/40 bg-slate-50 dark:bg-slate-900/80 space-y-4">
                    <h5 className="font-black text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>{isAr ? 'رصد الدرجة واعتماد النتيجة النهائية:' : 'Final Grade & Creator Remarks:'}</span>
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-right">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                          {isAr ? `الدرجة النهائية الكلية (من ${activeReview.totalQuestions}):` : `Final Total Score (out of ${activeReview.totalQuestions}):`}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={activeReview.totalQuestions}
                            value={awardedScore}
                            onChange={(e) =>
                              setAwardedScore(
                                Math.min(
                                  activeReview.totalQuestions,
                                  Math.max(0, parseInt(e.target.value) || 0)
                                )
                              )
                            }
                            className="w-28 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center font-mono font-black text-base text-primary outline-none focus:border-primary"
                          />
                          <span className="text-xs text-slate-400 font-bold">
                            / {activeReview.totalQuestions} {isAr ? 'درجة' : 'marks'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-right">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                          {isAr ? 'ملاحظات المعلم / المنشئ للطالب (اختياري):' : 'Creator Notes / Feedback (Optional):'}
                        </label>
                        <textarea
                          rows={2}
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder={isAr ? 'أحسنت! إجابة دقيقة ومنظمة...' : 'Good job! Well structured explanation...'}
                          className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    {actionError && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{actionError}</span>
                      </div>
                    )}

                    {actionSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{actionSuccess}</span>
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleGradeSubmit}
                        disabled={submitting}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-primary text-white font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow-md shadow-violet-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{isAr ? 'جاري الاعتماد...' : 'Submitting...'}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{isAr ? 'اعتماد الدرجة وإرسال النتيجة للطالب ✨' : 'Finalize Grade & Notify Student ✨'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
