import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, MailCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface EmailVerificationStepProps {
  email: string;
  lang?: 'ar' | 'en';
  onVerified: () => void;
  onBack: () => void;
}

const RESEND_COOLDOWN_SECONDS = 60;

export function EmailVerificationStep({ email, lang = 'ar', onVerified, onBack }: EmailVerificationStepProps) {
  const isAr = lang === 'ar';
  const { verifyEmailCode, resendEmailVerification } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsRemaining]);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!/^\d{6}$/.test(code)) {
      setError(isAr ? 'أدخل رمز التحقق المكوّن من 6 أرقام.' : 'Enter the 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyEmailCode(email, code);
      setSuccess(isAr ? 'تم تأكيد بريدك الإلكتروني بنجاح.' : 'Your email has been confirmed successfully.');
      window.setTimeout(onVerified, 450);
    } catch (verificationError: any) {
      setError(verificationError.message || (isAr ? 'تعذر تأكيد البريد. حاول مرة أخرى.' : 'We could not confirm your email. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (secondsRemaining > 0 || isResending) return;
    setError('');
    setSuccess('');
    setIsResending(true);
    try {
      await resendEmailVerification(email);
      setSecondsRemaining(RESEND_COOLDOWN_SECONDS);
      setSuccess(isAr ? 'أرسلنا رمزاً جديداً إلى بريدك الإلكتروني.' : 'A new code has been sent to your email.');
    } catch (resendError: any) {
      setError(resendError.message || (isAr ? 'تعذر إرسال رمز جديد حالياً.' : 'We could not send a new code right now.'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <section className="space-y-5 text-center" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
        <MailCheck className="h-7 w-7" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white">{isAr ? 'أكد بريدك الإلكتروني' : 'Confirm your email'}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {isAr ? 'أرسلنا رمزاً مكوناً من 6 أرقام إلى' : 'We sent a 6-digit verification code to'}
          <span className="mt-1 block break-all font-bold text-slate-900 dark:text-white" dir="ltr">{email}</span>
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4" noValidate>
        <label htmlFor="signup-email-code" className="sr-only">{isAr ? 'رمز تأكيد البريد' : 'Email verification code'}</label>
        <input
          id="signup-email-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'signup-email-code-error' : 'signup-email-code-help'}
          className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-center font-mono text-2xl font-black tracking-[0.45em] text-slate-900 outline-none transition-colors placeholder:tracking-[0.35em] focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
        />
        <p id="signup-email-code-help" className="text-xs text-slate-500 dark:text-slate-400">
          {isAr ? 'لا تشارك هذا الرمز مع أي شخص.' : 'Never share this code with anyone.'}
        </p>

        {error && <p id="signup-email-code-error" role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
        {success && <p role="status" className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"><CheckCircle2 className="h-4 w-4" />{success}</p>}

        <button
          type="submit"
          disabled={isSubmitting || code.length !== 6}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 text-sm font-black text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {isAr ? 'تأكيد الرمز والمتابعة' : 'Verify and continue'}
        </button>
      </form>

      <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400">{isAr ? 'لم يصلك الرمز؟' : 'Didn’t receive the code?'}</p>
        <button
          type="button"
          onClick={handleResend}
          disabled={secondsRemaining > 0 || isResending}
          className="min-h-11 text-xs font-bold text-violet-700 transition-colors hover:text-violet-600 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-violet-300 dark:hover:text-violet-200"
        >
          {isResending
            ? (isAr ? 'جارٍ إرسال رمز جديد...' : 'Sending a new code...')
            : secondsRemaining > 0
              ? (isAr ? `إعادة الإرسال بعد ${secondsRemaining} ثانية` : `Resend in ${secondsRemaining}s`)
              : (isAr ? 'إرسال رمز جديد' : 'Send a new code')}
        </button>
        <button type="button" onClick={onBack} className="flex min-h-11 w-full items-center justify-center gap-1 text-xs font-bold text-slate-600 transition-colors hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
          <ArrowRight className="h-3.5 w-3.5" />
          {isAr ? 'العودة وتعديل البريد' : 'Back and edit email'}
        </button>
      </div>
    </section>
  );
}
