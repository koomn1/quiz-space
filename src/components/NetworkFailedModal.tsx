import React from 'react';
import { XCircle, Sparkles, Award, ExternalLink } from 'lucide-react';

interface NetworkFailedModalProps {
  isOpen: boolean;
  lang: 'ar' | 'en';
  onClose: () => void;
  onActivateLocalSandboxMode: () => void;
  onRetryConnecting: () => void;
}

export default function NetworkFailedModal({
  isOpen,
  lang,
  onClose,
  onActivateLocalSandboxMode,
  onRetryConnecting
}: NetworkFailedModalProps) {
  if (!isOpen) return null;
  const isAr = lang === 'ar';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 dark:bg-[#05060b]/98 backdrop-blur-md">
      <div
        
        
        
        className="w-full max-w-lg bg-white dark:bg-[#111827] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border border-indigo-150 dark:border-indigo-950/80 text-right relative overflow-hidden"
        dir={isAr ? 'rtl' : 'ltr'}
        style={{ textAlign: isAr ? 'right' : 'left' }}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className={`flex ${isAr ? 'justify-start' : 'justify-end'}`}>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:text-slate-350 dark:hover:text-white transition-colors cursor-pointer"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-550 dark:text-indigo-400">
            <Sparkles className="w-7 h-7 animate-pulse" />
          </div>
          <h3 className="font-display font-black text-xl text-slate-900 dark:text-white leading-tight">
            {isAr 
              ? 'تم اكتشاف قيود شبكة أو جدار حماية! 🔒' 
              : 'Network or Sandboxing Restriction Detected! 🔒'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
            {isAr 
              ? 'تعذر الوصول إلى خوادم التحقق الآمنة من جوجل (Firebase Auth) بسبب قيود المتصفح داخل وضع المعاينة (Sandbox iFrame) أو قيود جدار الحماية للشبكة.' 
              : 'A network failure occurred when attempting to connect to Google Auth servers. This is common when running inside a sandboxed iframe or a secure proxy environment.'}
          </p>
        </div>

        {/* Super Bypass - Active Sandbox mode with Premium status */}
        <div className="bg-gradient-to-br from-indigo-500/10 via-primary/5 to-transparent border border-indigo-100 dark:border-indigo-950 p-5 rounded-2.5xl space-y-3.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-xl" />
          
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
              {isAr ? 'تجاوز ذكي متاح حالياً (موصى به):' : 'Instant Bypass Available (Recommended):'}
            </span>
          </div>
          
          <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium">
            {isAr
              ? 'يمكنك تفعيل "الوضع المحلي الذكي" (Sandbox Mode) لتخطي عوائق الشبكة تماماً ومتابعة استخدام التطبيق بكافة ميزاته والوصول الفوري للعضوية الذهبية الفائقة مع حفظ بياناتك محلياً!'
              : 'You can activate the "Local Sandbox Mode" to bypass network requirements completely. This instantly unlocks all premium student features, saving your progression and scores locally!'}
          </p>

          <button
            onClick={onActivateLocalSandboxMode}
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5"
          >
            <Award className="w-4 h-4 text-amber-300 animate-bounce" />
            <span>{isAr ? 'تفعيل الوضع المحلي الفائق والبدء فوراً ⚡' : 'Activate Local Premium Sandbox Mode ⚡'}</span>
          </button>
        </div>

        {/* Standard Troubleshooting options */}
        <div className="space-y-2.5">
          <button
            onClick={() => {
              onClose();
              window.open(window.location.href, '_blank');
            }}
            className="w-full py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900/40 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-330 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5"
          >
            <ExternalLink className="w-4 h-4" />
            <span>{isAr ? 'فتح في نافذة مستقلة وتجربة Google Auth ↗' : 'Try Google Auth in New Tab ↗'}</span>
          </button>

          <button
            onClick={onRetryConnecting}
            className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
          >
            {isAr ? 'إعادة محاولة الاتصال 🔄' : 'Retry Connecting 🔄'}
          </button>
        </div>
      </div>
    </div>
  );
}
