import React from 'react';
import { Zap, X, FileText } from 'lucide-react';
import { LiquidGlassSelect } from '../LiquidGlassSelect';
import { COSMO_QUIZ_COUNT_OPTIONS } from '../../lib/cosmoQuizCount';
import { CosmoPalette } from './CosmoPalette';

const ACCENT = '#007472';

export interface PendingQuizConfig {
  topic: string;
  amount: number;
  difficulty: string;
  questionTypes: 'mixed' | 'mcq' | 'tf';
  focusMode: 'comprehensive' | 'challenging' | 'exam_prep';
}

export function CosmoQuizStudioModal({
  pendingQuiz,
  isGeneratingQuiz,
  quizGenStage,
  quizGenPercent,
  pendingQuizAttachmentName,
  theme,
  isAr,
  onUpdatePendingQuiz,
  onCancel,
  onConfirmGeneration,
}: {
  pendingQuiz: PendingQuizConfig;
  isGeneratingQuiz: boolean;
  quizGenStage: string;
  quizGenPercent: number;
  pendingQuizAttachmentName?: string;
  theme: CosmoPalette;
  isAr: boolean;
  onUpdatePendingQuiz: React.Dispatch<React.SetStateAction<PendingQuizConfig | null>>;
  onCancel: () => void;
  onConfirmGeneration: () => void;
}) {
  return (
    <div
      className="rounded-3xl p-6 border shadow-2xl transition-all"
      dir="rtl"
      style={{
        background: theme.IS_DARK
          ? 'linear-gradient(145deg, #10162a 0%, #0d1222 100%)'
          : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
        borderColor: 'rgba(0,116,114,0.45)',
        boxShadow: '0 12px 36px rgba(0,116,114,0.15)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-[#007472] via-[#2AC3BB] to-[#EE8361] text-white shadow-lg shadow-[#EE8361]/25">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base sm:text-lg" style={{ color: theme.FG }}>
                {isAr ? 'تأكيد إعدادات الاختبار' : 'Confirm quiz settings'}
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              {isAr
                ? 'توليد أسئلة أكاديمية دقيقة مع خيارات تمويه ذكية وتفسيرات تعليمية وافية'
                : 'High-quality questions with plausible distractors and rich explanations'}
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          disabled={isGeneratingQuiz}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="إغلاق إعدادات الاختبار"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Settings Grid */}
      <div className="space-y-4">
        {/* Topic Input */}
        <div className="rounded-2xl p-3.5 border" style={{ background: theme.INPUT_BG, borderColor: theme.BORDER }}>
          <label className="block text-xs font-bold text-slate-400 mb-1.5">
            {isAr ? 'موضوع أو مجال الاختبار' : 'Quiz Topic'}
          </label>
          <input
            value={pendingQuiz.topic}
            onChange={e => onUpdatePendingQuiz(prev => (prev ? { ...prev, topic: e.target.value } : prev))}
            placeholder={isAr ? 'اكتب موضوع الدرس، المفاهيم، أو محتوى المنهج...' : 'Enter subject or topics...'}
            className="w-full bg-transparent outline-none font-bold text-sm"
            style={{ color: theme.FG }}
          />
        </div>

        {/* Question Count Selectors */}
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2">
            {isAr ? 'عدد الأسئلة المطلوبة' : 'Number of Questions'}
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {[0, ...COSMO_QUIZ_COUNT_OPTIONS].map(count => {
              const isSelected = pendingQuiz.amount === count;
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => onUpdatePendingQuiz(prev => (prev ? { ...prev, amount: count } : prev))}
                  className="py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center"
                  style={{
                    background: isSelected ? 'rgba(0,116,114,0.2)' : theme.INPUT_BG,
                    borderColor: isSelected ? ACCENT : theme.BORDER,
                    color: isSelected ? (theme.IS_DARK ? '#ffffff' : ACCENT) : theme.MUTED,
                  }}
                >
                  {count === 0 ? (isAr ? 'تلقائي' : 'Auto') : `${count} ${isAr ? 'أسئلة' : 'Q'}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty Tier */}
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2">
            {isAr ? 'مستوى الصعوبة الأكاديمي' : 'Difficulty Level'}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { id: 'سهل', label: 'سهل ومباشر', sub: 'مفاهيم أساسية وتعاريف واضحة', icon: '', color: '#10b981' },
              { id: 'متوسط', label: 'متوسط ومتوازن', sub: 'فهم وتطبيق عملي ومقارنات', icon: '', color: '#f59e0b' },
              { id: 'صعب', label: 'متقدم وتحدي', sub: 'تفكير نقدي وتحليل حالات غير مباشرة', icon: '', color: '#ef4444' },
            ].map(tier => {
              const isSelected = pendingQuiz.difficulty === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => onUpdatePendingQuiz(prev => (prev ? { ...prev, difficulty: tier.id } : prev))}
                  className="p-3 rounded-2xl border text-right transition-all cursor-pointer"
                  style={{
                    background: isSelected ? `${tier.color}18` : theme.INPUT_BG,
                    borderColor: isSelected ? tier.color : theme.BORDER,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs" style={{ color: isSelected ? tier.color : theme.FG }}>
                      {tier.label}
                    </span>
                    <span>{tier.icon}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{tier.sub}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Types & Focus Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="rounded-2xl p-3 border uipro-glass-surface backdrop-blur-xl" style={{ borderColor: theme.BORDER }}>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
              {isAr ? 'نوعية الأسئلة' : 'Question Types'}
            </label>
            <LiquidGlassSelect
              size="sm"
              value={pendingQuiz.questionTypes}
              onChange={val => onUpdatePendingQuiz(prev => (prev ? { ...prev, questionTypes: val as any } : prev))}
              options={[
                { value: 'mixed', label: isAr ? 'مزيج ذكي (اختيار من متعدد + صح وخطأ)' : 'Mixed (MCQ + True/False)', icon: '' },
                { value: 'mcq', label: isAr ? 'اختيار من متعدد فقط (4 خيارات)' : 'Multiple Choice Only', icon: '' },
                { value: 'tf', label: isAr ? 'صح أو خطأ فقط' : 'True / False Only', icon: '' },
              ]}
              dir={isAr ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="rounded-2xl p-3 border uipro-glass-surface backdrop-blur-xl" style={{ borderColor: theme.BORDER }}>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
              {isAr ? 'وضع التركيز' : 'Focus Mode'}
            </label>
            <LiquidGlassSelect
              size="sm"
              value={pendingQuiz.focusMode}
              onChange={val => onUpdatePendingQuiz(prev => (prev ? { ...prev, focusMode: val as any } : prev))}
              options={[
                { value: 'comprehensive', label: isAr ? 'تغطية شاملة لكامل المنهج' : 'Comprehensive', icon: '' },
                { value: 'exam_prep', label: isAr ? 'مراجعة وتوقعات ليلة الامتحان' : 'Exam Prep', icon: '' },
                { value: 'challenging', label: isAr ? 'التركيز على نقاط الضعف والمفاهيم الصعبة' : 'Challenging Concepts', icon: '' },
              ]}
              dir={isAr ? 'rtl' : 'ltr'}
            />
          </div>
        </div>

        {/* Attached file reminder if present */}
        {pendingQuizAttachmentName && (
          <div className="p-3 rounded-xl border flex items-center gap-2.5 text-xs text-[#007472] dark:text-[#2AC3BB] bg-[#007472]/10 border-[#2AC3BB]/30">
            <FileText className="w-4 h-4 text-[#2AC3BB]" />
            <span>
              سيتم استخراج الأسئلة مباشرة من ملفك المحلي: <strong>{pendingQuizAttachmentName}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Generation Progress Bar */}
      {isGeneratingQuiz && (
        <div className="mt-5 p-4 rounded-2xl border space-y-2 bg-slate-900/50 border-[#2AC3BB]/30">
          <div className="flex items-center justify-between text-xs font-bold text-[#007472] dark:text-[#2AC3BB]">
            <span>{quizGenStage || (isAr ? 'جاري صياغة وتوليد الاختبار...' : 'Generating quiz...')}</span>
            <span>{quizGenPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden bg-slate-800">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${quizGenPercent}%`,
                background: 'linear-gradient(90deg, #007472, #2AC3BB, #EE8361)',
              }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 mt-5">
        <button
          type="button"
          onClick={onCancel}
          disabled={isGeneratingQuiz}
          className="rounded-xl px-5 py-3 font-bold border text-xs cursor-pointer transition-colors"
          style={{ background: theme.INPUT_BG, borderColor: theme.BORDER, color: theme.FG }}
        >
          {isAr ? 'إلغاء' : 'Cancel'}
        </button>

        <button
          type="button"
          onClick={onConfirmGeneration}
          disabled={isGeneratingQuiz || !pendingQuiz.topic.trim()}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 font-extrabold text-xs text-white shadow-xl shadow-[#007472]/30 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #007472 0%, #2AC3BB 100%)' }}
        >
          <Zap className="w-4 h-4" />
          <span>
            {isGeneratingQuiz
              ? isAr
                ? 'جاري التوليد والتدقيق...'
                : 'Generating...'
              : isAr
              ? pendingQuiz.amount === 0
                ? 'توليد الاختبار بالعدد المناسب تلقائيًا'
                : `توليد الاختبار الآن (${pendingQuiz.amount} أسئلة)`
              : pendingQuiz.amount === 0
              ? 'Generate an auto-sized quiz'
                : `Start generating (${pendingQuiz.amount} questions)`}
          </span>
        </button>
      </div>
    </div>
  );
}

export default CosmoQuizStudioModal;
