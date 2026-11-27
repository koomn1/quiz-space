import React, { useRef, useState } from 'react';
import { X, Download, Share2, Sparkles, Check, Loader2, Award, QrCode } from 'lucide-react';
import { showToast } from './Toast';
import { MainLogo } from './MainLogo';
import { resolveProfileImageUrl } from '../constants/profileAssets';

export interface StoryCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  userName: string;
  userPhoto?: string | null;
  activeFrameUrl?: string | null;
  lang?: 'ar' | 'en';
  quizId?: string;
}

export const StoryCardModal: React.FC<StoryCardModalProps> = ({
  isOpen,
  onClose,
  quizTitle,
  score,
  totalQuestions,
  userName,
  userPhoto,
  activeFrameUrl,
  lang = 'ar',
  quizId,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const isAr = lang === 'ar';

  if (!isOpen) return null;

  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const quizUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?quiz=${quizId || ''}`
    : '';

  const handleDownloadImage = async () => {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const html2canvasModule = await import('html2canvas');
      const html2canvas = (html2canvasModule.default || html2canvasModule) as any;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#031717',
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `quizspace-story-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      showToast('success', isAr ? 'تم تحميل بطاقة الستوري بنجاح!' : 'Story card downloaded successfully!');
    } catch (err: any) {
      console.error('[StoryCard] export failed', err);
      showToast('error', isAr ? 'تعذر تصدير الصورة.' : 'Failed to export story card.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyLink = () => {
    if (quizUrl) {
      navigator.clipboard.writeText(quizUrl);
      showToast('success', isAr ? 'تم نسخ رابط الاختبار!' : 'Quiz link copied to clipboard!');
    }
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative my-auto flex flex-col items-center max-w-sm w-full">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-12 end-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
          title={isAr ? 'إغلاق' : 'Close'}
        >
          <X className="h-5 w-5" />
        </button>

        {/* 9:16 Story Card Canvas */}
        <div
          ref={cardRef}
          className="relative w-full aspect-[9/16] overflow-hidden rounded-[32px] border border-[#2AC3BB]/30 bg-gradient-to-b from-[#031717] via-[#072424] to-[#010b0b] p-6 text-[#FCF6EE] shadow-2xl flex flex-col justify-between"
          style={{ minHeight: '520px' }}
        >
          {/* Ambient Lighting Orbs */}
          <div className="pointer-events-none absolute -top-16 -end-16 h-48 w-48 rounded-full bg-[#007472]/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -start-16 h-48 w-48 rounded-full bg-[#EE8361]/25 blur-3xl" />

          {/* Top Brand Bar */}
          <div className="relative z-10 flex items-center justify-between border-b border-[#2AC3BB]/15 pb-4">
            <MainLogo size="sm" showText />
            <span className="rounded-full bg-[#EE8361]/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#EE8361] border border-[#EE8361]/30">
              {isAr ? 'إنجاز جديد' : 'ACHIEVEMENT'}
            </span>
          </div>

          {/* Center Identity & Score */}
          <div className="relative z-10 my-auto flex flex-col items-center text-center space-y-4 py-4">
            {/* User Avatar with Frame */}
            <div className="relative flex h-28 w-28 items-center justify-center">
              <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-[#2AC3BB]/40 bg-[#031717] shadow-xl">
                {userPhoto ? (
                  <img
                    src={resolveProfileImageUrl(userPhoto)}
                    alt={userName}
                    className="h-full w-full object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#007472] text-2xl font-black text-[#FCF6EE]">
                    {userName?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              {activeFrameUrl && (
                <img
                  src={activeFrameUrl}
                  alt="Frame"
                  crossOrigin="anonymous"
                  className="pointer-events-none absolute inset-0 h-full w-full object-contain scale-125"
                />
              )}
            </div>

            {/* Name */}
            <div>
              <h3 className="text-base font-black text-[#FCF6EE]">{userName}</h3>
              <p className="text-xs text-[#8BAEAD] mt-0.5 line-clamp-1 max-w-[240px]">{quizTitle}</p>
            </div>

            {/* Big Score Display */}
            <div className="rounded-3xl border border-[#2AC3BB]/30 bg-[#007472]/20 px-6 py-4 backdrop-blur-md shadow-inner flex flex-col items-center">
              <span className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-[#2AC3BB] via-[#FCF6EE] to-[#EE8361] bg-clip-text text-transparent">
                {percentage}%
              </span>
              <span className="text-xs font-bold text-[#8BAEAD] mt-1">
                {score} / {totalQuestions} {isAr ? 'إجابات صحيحة' : 'Correct'}
              </span>
            </div>
          </div>

          {/* Footer with QuizSpace Verification */}
          <div className="relative z-10 flex items-center justify-between border-t border-[#2AC3BB]/15 pt-3 text-xs text-[#8BAEAD]">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="h-3.5 w-3.5 text-[#2AC3BB]" />
              <span>{isAr ? 'تم الاختبار عبر كوزمو الذكي' : 'Verified on QuizSpace AI'}</span>
            </div>
            <span className="font-mono text-[#FCF6EE]/70">quizspace.app</span>
          </div>
        </div>

        {/* Modal Controls */}
        <div className="mt-4 flex w-full gap-2.5">
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadImage}
            className="flex-1 flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#007472] px-4 py-2.5 text-xs font-black text-[#FCF6EE] shadow-lg shadow-[#007472]/30 transition hover:bg-[#005e5c] active:scale-98 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span>{isAr ? 'تحميل الستوري (PNG)' : 'Download Story (PNG)'}</span>
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-black text-[#FCF6EE] transition hover:bg-white/20"
            title={isAr ? 'نسخ الرابط' : 'Copy link'}
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoryCardModal;
