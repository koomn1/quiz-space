import React from 'react';
import { XCircle, AlertTriangle, ExternalLink } from 'lucide-react';

interface PopupBlockedModalProps {
  isOpen: boolean;
  lang: 'ar' | 'en';
  onClose: () => void;
}

export default function PopupBlockedModal({
  isOpen,
  lang,
  onClose
}: PopupBlockedModalProps) {
  if (!isOpen) return null;
  const isAr = lang === 'ar';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 dark:bg-[#05060b]/95 backdrop-blur-md">
      <div
        
        
        
        className="w-full max-w-md bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border border-rose-100 dark:border-rose-950/80 text-right relative overflow-hidden"
        dir={isAr ? 'rtl' : 'ltr'}
        style={{ textAlign: isAr ? 'right' : 'left' }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className={`flex ${isAr ? 'justify-start' : 'justify-end'}`}>
          <button
            onClick={onClose}
            className="p-1 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:text-slate-350 dark:hover:text-white transition-colors cursor-pointer"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-550">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="font-display font-black text-xl text-slate-900 dark:text-slate-100 leading-tight">
            {isAr 
              ? 'تم حظر نافذة تسجيل الدخول من متصفحك! ⚠️' 
              : 'Sign-in Pop-up Blocked! ⚠️'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            {isAr 
              ? 'يقوم المتصفح بحظر النوافذ المنبثقة تلقائياً لوجود التطبيق حالياً داخل إطار مائي (iframe) آمن لـ Google AI Studio.' 
              : 'Your browser is blocking pop-ups because the application is running inside a Google AI Studio preview iframe.'}
          </p>
        </div>

        <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-950/40 p-4 rounded-2xl space-y-2 text-xs text-slate-600 dark:text-slate-350">
          <p className="font-bold text-amber-600 dark:text-amber-400">
            {isAr ? 'الحل الفعّال والسريع:' : 'Quick & Easy Solution:'}
          </p>
          <p className="leading-relaxed font-semibold">
            {isAr 
              ? 'افتح التطبيق في علامة تبويب كاملة ومستقلة لتسجيل الدخول بأمان وتجنب عوائق الحظر المطبقة من المتصفح.' 
              : 'Open the application in a separate full tab to sign in securely and bypass iframe constraints.'}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              onClose();
              window.open(window.location.href, '_blank');
            }}
            className="w-full py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-xs sm:text-sm shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5"
          >
            <ExternalLink className="w-4 h-4" />
            <span>{isAr ? 'فتح التطبيق في نافذة مستقلة ↗' : 'Open App in New Tab ↗'}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-330 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            {isAr ? 'إغلاق ومتابعة كزائر 👤' : 'Close & Continue as Guest 👤'}
          </button>
        </div>
      </div>
    </div>
  );
}
