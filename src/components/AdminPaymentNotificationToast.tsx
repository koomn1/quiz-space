import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CreditCard, ArrowUpRight, X, Sparkles, MoveHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { PaymentAlertInfo } from '../hooks/useAdminPaymentAlerts';

export interface AdminPaymentNotificationToastProps {
  alert: PaymentAlertInfo | null;
  alerts?: PaymentAlertInfo[];
  pendingPaymentCount?: number;
  onDismiss: () => void;
  onDismissAlert?: (id: string) => void;
  onNavigateToPayments: () => void;
  lang?: 'ar' | 'en';
  autoDismissDuration?: number; // In milliseconds, default 9000 (9s)
}

export function AdminPaymentNotificationToast({
  alert,
  alerts = alert ? [alert] : [],
  pendingPaymentCount,
  onDismiss,
  onDismissAlert,
  onNavigateToPayments,
  lang = 'ar',
  autoDismissDuration = 9000,
}: AdminPaymentNotificationToastProps) {
  const isAr = lang === 'ar';
  const effectiveAlerts = alerts.length > 0 ? alerts : (alert ? [alert] : []);

  // Exit animation state
  const [isExiting, setIsExiting] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'down' | 'fade'>('fade');

  // Interactive controls
  const [isPaused, setIsPaused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [progress, setProgress] = useState(100);

  // Swipe / Drag gesture state
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger smooth dismissal
  const handleDismiss = useCallback((direction: 'left' | 'right' | 'down' | 'fade' = 'fade') => {
    if (isExiting) return;
    setIsExiting(true);
    setExitDirection(direction);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }
    // Allow animation to complete before unmounting
    setTimeout(() => {
      onDismiss();
    }, 280);
  }, [isExiting, onDismiss]);

  // Auto-dismiss countdown timer with pause-on-hover
  useEffect(() => {
    if (effectiveAlerts.length === 0 || isExiting || autoDismissDuration <= 0) return;

    const intervalMs = 50;
    const step = (intervalMs / autoDismissDuration) * 100;

    const timer = setInterval(() => {
      if (!isPaused && !isDraggingRef.current) {
        setProgress((prev) => {
          if (prev <= step) {
            clearInterval(timer);
            handleDismiss('down');
            return 0;
          }
          return prev - step;
        });
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [effectiveAlerts.length, isExiting, isPaused, autoDismissDuration, handleDismiss]);

  // Reset progress bar if new alerts arrive
  useEffect(() => {
    if (effectiveAlerts.length > 0) {
      setProgress(100);
      setIsExiting(false);
    }
  }, [effectiveAlerts.length]);

  // Keyboard shortcut: Escape to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && effectiveAlerts.length > 0) {
        handleDismiss('fade');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [effectiveAlerts.length, handleDismiss]);

  // Touch gesture handlers (mobile swipe)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (effectiveAlerts.length === 0 || isExiting) return;
    dragStartXRef.current = e.touches[0].clientX;
    isDraggingRef.current = true;
    setIsDragging(true);
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - dragStartXRef.current;
    setDragX(deltaX);
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    setIsPaused(false);

    const threshold = 75;
    if (Math.abs(dragX) > threshold) {
      handleDismiss(dragX > 0 ? 'right' : 'left');
    } else {
      setDragX(0);
    }
  };

  // Mouse drag handlers (desktop drag to dismiss)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with primary mouse button and not on interactive buttons/links
    if (e.button !== 0 || isExiting) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) return;

    dragStartXRef.current = e.clientX;
    isDraggingRef.current = true;
    setIsDragging(true);
    setIsPaused(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = moveEvent.clientX - dragStartXRef.current;
      setDragX(deltaX);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      setIsPaused(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const threshold = 80;
      if (Math.abs(dragX) > threshold) {
        handleDismiss(dragX > 0 ? 'right' : 'left');
      } else {
        setDragX(0);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (effectiveAlerts.length === 0) return null;

  // Compute transform styles based on dragging or exit state
  let transformStyle: React.CSSProperties;
  if (isDragging) {
    transformStyle = {
      transform: `translateX(${dragX}px) rotate(${dragX * 0.04}deg)`,
      opacity: Math.max(0.2, 1 - Math.abs(dragX) / 260),
      cursor: 'grabbing',
      transition: 'none',
      touchAction: 'none',
    };
  } else if (isExiting) {
    transformStyle = {
      transform:
        exitDirection === 'left'
          ? 'translateX(-125%) rotate(-10deg)'
          : exitDirection === 'right'
          ? 'translateX(125%) rotate(10deg)'
          : exitDirection === 'down'
          ? 'translateY(30px) scale(0.92)'
          : 'translateY(15px) scale(0.95)',
      opacity: 0,
      transition: 'transform 260ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 260ms ease',
      pointerEvents: 'none',
    };
  } else {
    transformStyle = {
      transform: 'translateX(0px) rotate(0deg)',
      opacity: 1,
      transition: 'transform 320ms cubic-bezier(0.34, 1.4, 0.64, 1), opacity 260ms ease',
    };
  }

  const primaryAlert = effectiveAlerts[0];
  const totalCount = pendingPaymentCount ?? effectiveAlerts.length;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50 max-w-md w-[calc(100vw-2rem)] sm:w-full select-none"
      style={{
        direction: isAr ? 'rtl' : 'ltr',
        textAlign: isAr ? 'right' : 'left',
      }}
    >
      <div
        ref={cardRef}
        style={transformStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => {
          if (!isDraggingRef.current) setIsPaused(false);
        }}
        className="relative overflow-hidden rounded-2xl border-2 border-amber-400/70 bg-gradient-to-br from-slate-950 via-[#181102] to-slate-950 p-4 sm:p-5 text-white shadow-[0_20px_50px_rgba(245,158,11,0.22)] backdrop-blur-2xl transition-shadow hover:shadow-[0_25px_60px_rgba(245,158,11,0.32)] cursor-grab active:cursor-grabbing"
      >
        {/* Ambient celestial gold glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/25 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-amber-400/15 rounded-full blur-xl pointer-events-none" />

        {/* Top header row */}
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-start gap-3 min-w-0">
            {/* Glowing Golden Icon */}
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/30 shrink-0 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
            </div>

            {/* Title & Badge */}
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-amber-500/20 text-amber-300 border border-amber-400/40">
                  <Sparkles className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                  {isAr ? 'طلب دفع واشتراك جديد' : 'New Payment Request'}
                </span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              </div>

              <h4 className="text-xs sm:text-sm font-black text-white truncate">
                {isAr
                  ? `${totalCount} ${totalCount === 1 ? 'طلب دفع معلق يحتاج اعتمادك' : 'طلبات دفع معلقة'}`
                  : `${totalCount} pending payment ${totalCount === 1 ? 'request' : 'requests'}`}
              </h4>
            </div>
          </div>

          {/* Dismiss 'X' Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss('fade');
            }}
            aria-label={isAr ? 'إغلاق الإشعار' : 'Dismiss notification'}
            title={isAr ? 'إغلاق الإشعار (أو اسحب لأي جنب)' : 'Close notification (or swipe)'}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer shrink-0 border border-white/5 hover:border-amber-400/30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Requests List */}
        <div className="mt-3 relative z-10">
          {effectiveAlerts.length === 1 ? (
            /* Single Request Card */
            <div className="rounded-xl bg-white/[0.06] border border-amber-400/20 p-2.5 sm:p-3 text-xs text-slate-200">
              <div className="flex items-center justify-between gap-2">
                <strong className="truncate font-black text-amber-200 text-sm">
                  {primaryAlert.name}
                </strong>
                {primaryAlert.amount !== undefined && (
                  <span className="shrink-0 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-400/30">
                    {primaryAlert.amount} {isAr ? 'ج.م' : 'EGP'}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-300 flex-wrap">
                <span className="font-semibold text-amber-100">{primaryAlert.planName}</span>
                {primaryAlert.paymentMethod && (
                  <span className="text-slate-400 flex items-center gap-1">
                    · {primaryAlert.paymentMethod === 'instapay'
                      ? 'InstaPay'
                      : primaryAlert.paymentMethod === 'vodafone' || primaryAlert.paymentMethod === 'vodafone_cash'
                      ? 'Vodafone Cash'
                      : primaryAlert.paymentMethod === 'bank_transfer'
                      ? (isAr ? 'تحويل بنكي' : 'Bank Transfer')
                      : primaryAlert.paymentMethod}
                  </span>
                )}
                {primaryAlert.email && (
                  <span className="text-slate-500 truncate max-w-[140px] text-[10px]">
                    ({primaryAlert.email})
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* Multiple Requests Preview with Accordion */
            <div className="space-y-1.5">
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {(isExpanded ? effectiveAlerts : effectiveAlerts.slice(0, 2)).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-white/[0.06] border border-white/5 p-2 text-[11px] text-slate-200 flex items-center justify-between gap-2 hover:bg-white/[0.09] transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <strong className="truncate font-bold text-amber-200">{item.name}</strong>
                        {item.amount !== undefined && (
                          <span className="text-emerald-300 font-black text-[10px]">
                            {item.amount} {isAr ? 'ج.م' : 'EGP'}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {item.planName}
                        {item.paymentMethod && ` · ${item.paymentMethod}`}
                      </div>
                    </div>
                    {onDismissAlert && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismissAlert(item.id);
                        }}
                        className="shrink-0 text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10"
                        aria-label={isAr ? 'إخفاء هذا الطلب' : 'Hide request'}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {effectiveAlerts.length > 2 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="w-full py-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center justify-center gap-1 transition-colors"
                >
                  {isExpanded
                    ? (isAr ? 'عرض أقل' : 'Show less')
                    : (isAr ? `عرض باقي الطلبات (${effectiveAlerts.length - 2} إضافي)...` : `Show ${effectiveAlerts.length - 2} more...`)}
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Controls & Swipe Helper */}
        <div className="mt-3.5 pt-3 border-t border-amber-400/20 flex items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
            <MoveHorizontal className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>{isAr ? 'اسحب لأي جانب للإغلاق' : 'Swipe to dismiss'}</span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss('fade');
              onNavigateToPayments();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/30 active:scale-95"
          >
            <span>{isAr ? 'مراجعة وتفعيل الطلب' : 'Review & Activate'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Golden countdown progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-950/40 overflow-hidden rounded-b-2xl">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 transition-all duration-75 ease-linear shadow-[0_0_8px_rgba(251,191,36,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
