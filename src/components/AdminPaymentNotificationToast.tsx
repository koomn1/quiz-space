import React from 'react';
import { CreditCard, ArrowUpRight, X, Sparkles } from 'lucide-react';
import { PaymentAlertInfo } from '../hooks/useAdminPaymentAlerts';

interface AdminPaymentNotificationToastProps {
  alert: PaymentAlertInfo | null;
  alerts?: PaymentAlertInfo[];
  onDismiss: () => void;
  onDismissAlert?: (id: string) => void;
  onNavigateToPayments: () => void;
  lang?: 'ar' | 'en';
}

export function AdminPaymentNotificationToast({
  alert,
  alerts = alert ? [alert] : [],
  onDismiss,
  onDismissAlert,
  onNavigateToPayments,
  lang = 'ar',
}: AdminPaymentNotificationToastProps) {
  if (alerts.length === 0) return null;
  const isAr = lang === 'ar';

  return (
    <div 
      role="alert"
      className="fixed bottom-5 left-5 z-50 max-w-md w-full animate-in slide-in-from-bottom-5 duration-300"
      style={{ direction: isAr ? 'rtl' : 'ltr', textAlign: isAr ? 'right' : 'left' }}
    >
      <div className="relative overflow-hidden rounded-2xl border-2 border-amber-400/60 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 p-4 text-white shadow-2xl shadow-amber-500/20 backdrop-blur-2xl">
        {/* Ambient subtle glow */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/20 rounded-full blur-xl pointer-events-none" />
        
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 p-0.5 shadow-md shadow-amber-500/20 shrink-0 flex items-center justify-center">
              <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {isAr ? 'طلب اشتراك جديد معلق' : 'New Payment Request Pending'}
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              </div>

              <h4 className="text-xs sm:text-sm font-black text-white">
                {isAr ? `${alerts.length} طلبات دفع معلقة` : `${alerts.length} pending payment requests`}
              </h4>

              <div className="mt-2 max-h-36 space-y-1.5 overflow-y-auto pr-1">
                {alerts.map((item) => (
                  <div key={item.id} className="rounded-xl bg-white/5 px-2.5 py-2 text-[11px] text-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="truncate text-amber-200">{item.name}</strong>
                      {onDismissAlert && <button type="button" onClick={() => onDismissAlert(item.id)} className="shrink-0 text-slate-400 hover:text-white" aria-label={isAr ? 'إخفاء الطلب' : 'Hide request'}>×</button>}
                    </div>
                    <div className="mt-0.5 text-slate-300">
                      {item.planName}
                      {item.amount !== undefined && <span className="mx-1.5 font-black text-emerald-300">{item.amount} {isAr ? 'ج.م' : 'EGP'}</span>}
                      {item.paymentMethod && <span className="text-slate-400">· {item.paymentMethod === 'instapay' ? 'InstaPay' : item.paymentMethod === 'vodafone' || item.paymentMethod === 'vodafone_cash' ? 'Vodafone Cash' : item.paymentMethod}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label={isAr ? 'إغلاق الإشعار' : 'Dismiss notification'}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-400 font-bold">
            {isAr ? 'اضغط للمراجعة والقبول أو الرفض' : 'Review to approve or reject'}
          </span>
          <button
            type="button"
            onClick={() => {
              onDismiss();
              onNavigateToPayments();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all flex items-center gap-1 cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
          >
            <span>{isAr ? 'مراجعة وتفعيل الطلب' : 'Review Request'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
