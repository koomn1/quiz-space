import React from 'react';
import { Sparkles, X, ChevronLeft } from 'lucide-react';

export interface CosmoDialogueBubbleProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  actionLabel?: string;
  dismissLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  arrowPosition?: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'left' | 'right';
  className?: string;
}

export const CosmoDialogueBubble: React.FC<CosmoDialogueBubbleProps> = ({
  isOpen,
  title = 'مرشد كويز سبيس (كوزمو)',
  message = 'شوف إيه اللي انضاف جديد في كويز سبيس! لقد أضفنا ألعاب ألغاز جديدة وعجلة الحظ لجمع المزيد من النقاط، اضغط هنا لتجربتها!',
  actionLabel = 'خدني هناك',
  dismissLabel = 'فهمت، شكراً يا كوزمو',
  onAction,
  onDismiss,
  arrowPosition = 'bottom-center',
  className = '',
}) => {
  if (!isOpen) return null;

  return (
    <div
      dir="rtl"
      className={`relative z-30 max-w-sm sm:max-w-md w-full animate-in fade-in zoom-in-95 duration-200 ${className}`}
      data-testid="cosmo-dialogue-bubble"
    >
      {/* Speech Bubble Container with Luxury QuizSpace Card Design */}
      <div className="relative rounded-2xl bg-[#072424]/95 backdrop-blur-md p-4 sm:p-5 border border-[#2AC3BB]/35 shadow-[0_12px_40px_rgba(0,116,114,0.32)] text-[#FCF6EE]">
        {/* Subtle Ambient Glow inside Card */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2AC3BB]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-[#EE8361]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header with Title and Close Button */}
        <div className="flex items-center justify-between gap-3 mb-2.5 pb-2 border-b border-[#2AC3BB]/15">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#007472]/40 border border-[#2AC3BB]/40 flex items-center justify-center text-[#2AC3BB]">
              <Sparkles className="w-4 h-4 text-[#2AC3BB] animate-pulse" />
            </div>
            <h4 className="text-sm sm:text-base font-bold text-[#FCF6EE] tracking-wide">
              {title}
            </h4>
          </div>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 rounded-lg text-[#FCF6EE]/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="إغلاق المحادثة"
              data-testid="cosmo-close-icon-btn"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Friendly Message Body */}
        <p className="text-xs sm:text-sm text-[#FCF6EE]/90 leading-relaxed font-normal mb-4">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1">
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-[#FCF6EE]/75 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10 order-2 sm:order-1 text-center"
              data-testid="cosmo-dismiss-btn"
            >
              {dismissLabel}
            </button>
          )}

          {onAction && (
            <button
              type="button"
              onClick={onAction}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#EE8361] to-[#f49c7f] hover:from-[#e27350] hover:to-[#ee8361] shadow-[0_0_18px_rgba(238,131,97,0.45)] hover:shadow-[0_0_24px_rgba(238,131,97,0.65)] transition-all duration-200 flex items-center justify-center gap-1.5 order-1 sm:order-2 active:scale-95"
              data-testid="cosmo-take-me-there-btn"
            >
              <span>{actionLabel}</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Speech Bubble Arrow */}
        {arrowPosition === 'bottom-center' && (
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-[#072424] border-b border-l border-[#2AC3BB]/35 rotate-[-45deg] pointer-events-none" />
        )}
        {arrowPosition === 'bottom-right' && (
          <div className="absolute -bottom-2.5 right-8 w-5 h-5 bg-[#072424] border-b border-l border-[#2AC3BB]/35 rotate-[-45deg] pointer-events-none" />
        )}
        {arrowPosition === 'bottom-left' && (
          <div className="absolute -bottom-2.5 left-8 w-5 h-5 bg-[#072424] border-b border-l border-[#2AC3BB]/35 rotate-[-45deg] pointer-events-none" />
        )}
        {arrowPosition === 'top-center' && (
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-[#072424] border-t border-r border-[#2AC3BB]/35 rotate-[-45deg] pointer-events-none" />
        )}
        {arrowPosition === 'left' && (
          <div className="absolute top-1/2 -left-2.5 -translate-y-1/2 w-5 h-5 bg-[#072424] border-t border-l border-[#2AC3BB]/35 rotate-[-45deg] pointer-events-none" />
        )}
        {arrowPosition === 'right' && (
          <div className="absolute top-1/2 -right-2.5 -translate-y-1/2 w-5 h-5 bg-[#072424] border-b border-r border-[#2AC3BB]/35 rotate-[-45deg] pointer-events-none" />
        )}
      </div>
    </div>
  );
};

export default CosmoDialogueBubble;
