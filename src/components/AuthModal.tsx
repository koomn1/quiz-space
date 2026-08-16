import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Check, Chrome, Lock, Mail, RefreshCw, ShieldCheck, Sparkles, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { EmailVerificationStep } from './EmailVerificationStep';
import { isStrongPassword, passwordRequirementMessage } from '../lib/passwordPolicy';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess?: (user: any, token?: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login', onSuccess }) => {
  const { signIn, signInWithGoogle, signUp, verifyMfaCode, passwordRecovery, clearPasswordRecovery, requestPasswordReset, updatePassword } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'email' | '2fa' | 'forgot' | 'forgot-sent' | 'reset' | 'reset-success'>('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setError('');
    setSuccess('');
    setStep(passwordRecovery ? 'reset' : 'form');
    setVerificationCode('');
    setNewPassword('');
    setConfirmPassword('');
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        clearPasswordRecovery();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = username.trim();

    try {
      if (mode === 'register') {
        if (!cleanName) {
          setError('أدخل اسم المستخدم للبدء.');
          setLoading(false);
          return;
        }
        if (!isStrongPassword(password)) {
          setError(passwordRequirementMessage('ar'));
          setLoading(false);
          return;
        }

        await signUp(cleanEmail, password, cleanName);
        setSuccess('تم إرسال رابط التأكيد إلى بريدك الإلكتروني. افتح الرسالة لتفعيل حسابك.');
        setStep('email');
      } else {
        const result = await signIn(cleanEmail, password);
        if (result.status === 'MFA_REQUIRED') {
          setStep('2fa');
          setLoading(false);
          return;
        }
        onSuccess?.(null);
        onClose();
      }
    } catch (err: any) {
      if (err?.code === 'EMAIL_NOT_CONFIRMED') {
        setStep('email');
      } else {
        setError(err.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setSuccess('إذا كان البريد مرتبطاً بحساب، ستصلك رسالة تحتوي على رابط آمن لاستعادة كلمة المرور.');
      setStep('forgot-sent');
    } catch (err: any) {
      setError(err?.message || 'تعذر إرسال رابط الاستعادة حالياً. حاول مرة أخرى بعد قليل.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setError(passwordRequirementMessage('ar'));
      return;
    }

    setLoading(true);
    try {
      await updatePassword(newPassword);
      clearPasswordRecovery();
      setSuccess('تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بأمان.');
      setStep('reset-success');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err?.message || 'تعذر تحديث كلمة المرور حالياً. أعد فتح الرابط وحاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (verificationCode.length !== 6) {
      setError('أدخل رمز التحقق المكوّن من 6 أرقام.');
      return;
    }

    setIsVerifying2FA(true);
    setError('');
    try {
      await verifyMfaCode(verificationCode);
      onSuccess?.(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية.');
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'تعذر فتح تسجيل الدخول بجوجل. حاول مرة أخرى.');
      setGoogleLoading(false);
    }
  };

  const switchMode = () => {
    setMode((current) => current === 'login' ? 'register' : 'login');
    setError('');
    setSuccess('');
    clearPasswordRecovery();
    setStep('form');
    setVerificationCode('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleClose = () => {
    clearPasswordRecovery();
    onClose();
  };

  if (!isOpen) return null;

  const isRegister = mode === 'register';
  const isBusy = loading || googleLoading;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto p-3 sm:p-6" dir="rtl">
      <button
        type="button"
        aria-label="إغلاق نافذة تسجيل الدخول"
        className="absolute inset-0 cursor-default bg-slate-950/60 backdrop-blur-md motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
        onClick={handleClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        className="relative my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-white/80 bg-white shadow-[0_30px_100px_-35px_rgba(15,23,42,0.75)] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200 dark:border-slate-700 dark:bg-slate-950 sm:max-h-[calc(100dvh-3rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <section className="relative hidden w-[42%] shrink-0 overflow-hidden bg-[#0a1022] p-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute -left-24 top-12 h-64 w-64 rounded-full border border-cyan-200/10" />
          <div className="pointer-events-none absolute -left-10 top-28 h-44 w-44 rounded-full border border-violet-200/15" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-600/20 blur-[90px]" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-950/40">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-black">Quiz Space</p>
              <p className="text-[10px] font-bold text-cyan-100/60">تعلم أذكى، خطوة بخطوة</p>
            </div>
          </div>

          <div className="relative z-10 py-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-black text-cyan-100/80">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" aria-hidden="true" />
              مساحة تعلم شخصية
            </span>
            <h3 className="mt-5 text-4xl font-black leading-[1.25] tracking-tight">
              كل سؤال يقرّبك من <span className="bg-gradient-to-l from-cyan-200 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">هدفك.</span>
            </h3>
            <p className="mt-5 text-sm leading-7 text-slate-300/75">
              احفظ اختباراتك، تابع تقدمك، وخلي أدوات الذكاء الاصطناعي تساعدك تذاكر بوضوح أكبر.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-2.5">
            {[
              { icon: Sparkles, label: 'توليد ذكي' },
              { icon: ShieldCheck, label: 'تقدم محفوظ' },
              { icon: Check, label: 'نتائج واضحة' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.055] p-3">
                <Icon className="h-4 w-4 text-cyan-200" aria-hidden="true" />
                <p className="mt-2 text-[10px] font-bold text-white/75">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="min-w-0 flex-1 bg-white p-5 sm:p-8 dark:bg-slate-950">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-[10px] font-black text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {step === 'email' ? 'تأكيد البريد' : step === '2fa' ? 'حماية الحساب' : step === 'forgot' || step === 'forgot-sent' ? 'استعادة الوصول' : step === 'reset' || step === 'reset-success' ? 'تعيين كلمة المرور' : 'أهلاً بك في Quiz Space'}
              </div>
              <h2 id="auth-dialog-title" className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl dark:text-white">
                {step === 'email'
                  ? 'تفقد بريدك الإلكتروني'
                  : step === '2fa'
                    ? 'تأكيد إضافي للحساب'
                    : step === 'forgot' || step === 'forgot-sent'
                      ? 'استعد حسابك بسهولة'
                      : step === 'reset' || step === 'reset-success'
                        ? 'اختر كلمة مرور جديدة'
                        : (isRegister ? 'أنشئ حسابك' : 'أهلاً بعودتك')}
              </h2>
              <p className="mt-2 max-w-md text-xs leading-6 text-slate-500 sm:text-sm dark:text-slate-400">
                {step === 'email'
                  ? 'أرسلنا رابط التفعيل إلى بريدك. افتح الرسالة لتأكيد الحساب ثم عد إلى المنصة.'
                  : step === '2fa'
                    ? 'أدخل الرمز المكوّن من 6 أرقام من تطبيق المصادقة للمتابعة بأمان.'
                    : step === 'forgot' || step === 'forgot-sent'
                      ? 'أدخل بريدك وسنرسل لك رابطاً آمناً للعودة إلى حسابك.'
                      : step === 'reset' || step === 'reset-success'
                        ? 'استخدم كلمة مرور قوية جديدة لحماية اختباراتك وتقدمك.'
                        : (isRegister ? 'ابدأ مساحة تعلمك واحفظ تقدمك من أول اختبار.' : 'سجّل الدخول لمتابعة اختباراتك وتقدمك.')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {step === 'email' ? (
            <div className="space-y-6 py-3 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                <Mail className="h-8 w-8 motion-safe:animate-pulse" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">تفعيل الحساب</h3>
                <p className="mx-auto max-w-sm text-sm leading-7 text-slate-500 dark:text-slate-400">
                  أرسلنا رابط تأكيد الحساب إلى <span className="break-all font-black text-violet-700 dark:text-violet-300" dir="ltr">{email}</span>.
                </p>
              </div>
              {success && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">{success}</div>}
              <button
                type="button"
                onClick={() => { setStep('form'); setSuccess(''); }}
                className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition-all duration-200 hover:bg-violet-700 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/20"
              >
                العودة لتسجيل الدخول
              </button>
            </div>
          ) : step === 'forgot' ? (
            <form onSubmit={handlePasswordResetRequest} className="space-y-5" noValidate>
              <AuthField label="البريد الإلكتروني" htmlFor="auth-reset-email" icon={<Mail className="h-4.5 w-4.5" aria-hidden="true" />}>
                <input
                  id="auth-reset-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'auth-error' : 'auth-reset-help'}
                  className={fieldClassName}
                  dir="ltr"
                />
              </AuthField>
              <p id="auth-reset-help" className="-mt-1 px-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">لن نوضح ما إذا كان البريد مسجلاً حفاظاً على خصوصية الحسابات.</p>
              {error && <AuthError message={error} />}
              <button
                type="submit"
                disabled={isBusy || !email.trim()}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition-all duration-200 hover:bg-violet-700 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/20"
              >
                {loading ? <RefreshCw className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
                إرسال رابط الاستعادة
              </button>
              <button
                type="button"
                onClick={() => { setStep('form'); setError(''); setSuccess(''); }}
                className="min-h-11 w-full rounded-2xl px-4 text-xs font-black text-violet-700 transition-colors duration-200 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 dark:text-violet-300 dark:hover:bg-violet-500/10"
              >
                العودة لتسجيل الدخول
              </button>
            </form>
          ) : step === 'forgot-sent' ? (
            <div className="space-y-6 py-3 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <Mail className="h-8 w-8" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">راجع بريدك الإلكتروني</h3>
                <p className="mx-auto max-w-sm text-sm leading-7 text-slate-500 dark:text-slate-400">إذا كان البريد مرتبطاً بحساب، ستجد رسالة الاستعادة على <span className="break-all font-black text-violet-700 dark:text-violet-300" dir="ltr">{email}</span>.</p>
              </div>
              {success && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">{success}</div>}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => { setStep('forgot'); setSuccess(''); setError(''); }}
                  className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-800 transition-all duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/20 dark:border-slate-700 dark:text-white dark:hover:bg-slate-900"
                >
                  إرسال الرابط مرة أخرى
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('form'); setSuccess(''); setError(''); }}
                  className="min-h-11 w-full rounded-2xl px-4 text-xs font-black text-violet-700 transition-colors duration-200 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 dark:text-violet-300 dark:hover:bg-violet-500/10"
                >
                  العودة لتسجيل الدخول
                </button>
              </div>
            </div>
          ) : step === 'reset' ? (
            <form onSubmit={handlePasswordUpdate} className="space-y-4" noValidate>
              <AuthField label="كلمة المرور الجديدة" htmlFor="auth-new-password" icon={<Lock className="h-4.5 w-4.5" aria-hidden="true" />}>
                <input
                  id="auth-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  autoFocus
                  autoComplete="new-password"
                  minLength={10}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'auth-error' : 'auth-new-password-help'}
                  placeholder="••••••••"
                  className={fieldClassName}
                  dir="ltr"
                />
              </AuthField>
              <p id="auth-new-password-help" className="-mt-1 px-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{passwordRequirementMessage('ar')}</p>
              <AuthField label="تأكيد كلمة المرور الجديدة" htmlFor="auth-confirm-password" icon={<ShieldCheck className="h-4.5 w-4.5" aria-hidden="true" />}>
                <input
                  id="auth-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={10}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'auth-error' : undefined}
                  placeholder="••••••••"
                  className={fieldClassName}
                  dir="ltr"
                />
              </AuthField>
              {error && <AuthError message={error} />}
              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="mt-1 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition-all duration-200 hover:bg-violet-700 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/20"
              >
                {loading ? <RefreshCw className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                تحديث كلمة المرور
              </button>
            </form>
          ) : step === 'reset-success' ? (
            <div className="space-y-6 py-3 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <Check className="h-8 w-8" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">تم تحديث كلمة المرور</h3>
                <p className="mx-auto max-w-sm text-sm leading-7 text-slate-500 dark:text-slate-400">أصبح حسابك جاهزاً. استخدم كلمة المرور الجديدة لتسجيل الدخول إلى QuizSpace.</p>
              </div>
              {success && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">{success}</div>}
              <button
                type="button"
                onClick={() => { setStep('form'); setSuccess(''); setError(''); }}
                className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition-all duration-200 hover:bg-violet-700 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/20"
              >
                تسجيل الدخول الآن
              </button>
            </div>
          ) : step === '2fa' ? (
            <form onSubmit={handleMfaVerify} className="space-y-5" noValidate>
              <label htmlFor="auth-mfa-code" className="sr-only">رمز المصادقة الثنائية</label>
              <div className="relative">
                <ShieldCheck className="pointer-events-none absolute inset-y-0 right-4 my-auto h-5 w-5 text-slate-400" aria-hidden="true" />
                <input
                  id="auth-mfa-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="000000"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'auth-error' : undefined}
                  className="min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-12 text-center font-mono text-2xl font-black tracking-[0.4em] text-slate-950 outline-none transition duration-200 placeholder:text-slate-300 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  dir="ltr"
                />
              </div>
              {error && <AuthError message={error} />}
              <button
                type="submit"
                disabled={isVerifying2FA || verificationCode.length !== 6}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition-all duration-200 hover:bg-violet-700 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/20"
              >
                {isVerifying2FA ? <RefreshCw className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                تأكيد الرمز والمتابعة
              </button>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4" noValidate>
              {isRegister && (
                <AuthField label="الاسم الكامل" htmlFor="auth-username" icon={<UserIcon className="h-4.5 w-4.5" aria-hidden="true" />}>
                  <input
                    id="auth-username"
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                    autoComplete="name"
                    placeholder="أحمد محمد"
                    className={fieldClassName}
                  />
                </AuthField>
              )}

              <AuthField label="البريد الإلكتروني" htmlFor="auth-email" icon={<Mail className="h-4.5 w-4.5" aria-hidden="true" />}>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'auth-error' : undefined}
                  className={fieldClassName}
                  dir="ltr"
                />
              </AuthField>

              <AuthField label="كلمة المرور" htmlFor="auth-password" icon={<Lock className="h-4.5 w-4.5" aria-hidden="true" />}>
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  minLength={isRegister ? 10 : 1}
                  aria-describedby={isRegister ? 'auth-password-help' : error ? 'auth-error' : undefined}
                  placeholder="••••••••"
                  className={fieldClassName}
                  dir="ltr"
                />
              </AuthField>
              {isRegister && <p id="auth-password-help" className="-mt-1 px-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{passwordRequirementMessage('ar')}</p>}
              {!isRegister && (
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => { setStep('forgot'); setError(''); setSuccess(''); }}
                    className="min-h-11 px-1 text-xs font-black text-violet-700 transition-colors duration-200 hover:text-violet-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 dark:text-violet-300 dark:hover:text-violet-200"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
              )}

              {error && <AuthError message={error} />}
              {success && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">{success}</div>}

              <button
                type="submit"
                disabled={isBusy}
                className="mt-1 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition-all duration-200 hover:bg-violet-700 hover:shadow-violet-700/20 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/20"
              >
                {loading ? <RefreshCw className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />}
                {isRegister ? 'إنشاء الحساب' : 'تسجيل الدخول'}
              </button>

              <div className="flex items-center gap-3 py-1" aria-hidden="true">
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                <span className="text-[10px] font-black text-slate-400">أو</span>
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>

              <button
                type="button"
                onClick={() => void handleGoogleSignIn()}
                disabled={isBusy}
                className="flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              >
                {googleLoading ? <RefreshCw className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <Chrome className="h-5 w-5 text-red-500" aria-hidden="true" />}
                {googleLoading ? 'جارٍ فتح Google...' : 'المتابعة باستخدام Google'}
              </button>

              <div className="mt-3 border-t border-slate-100 pt-4 text-center dark:border-slate-800">
                <button
                  type="button"
                  onClick={switchMode}
                  className="min-h-11 px-3 text-xs font-black text-violet-700 transition-colors duration-200 hover:text-violet-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 dark:text-violet-300 dark:hover:text-violet-200"
                >
                  {isRegister ? 'لديك حساب بالفعل؟ سجّل دخولك' : 'مستخدم جديد؟ أنشئ حسابك الآن'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
};

const fieldClassName = 'min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pl-4 pr-11 text-sm font-medium text-slate-950 outline-none transition duration-200 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500';

function AuthField({ label, htmlFor, icon, children }: { label: string; htmlFor: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block px-1 text-xs font-black text-slate-700 dark:text-slate-300">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 right-3.5 my-auto flex h-5 items-center text-slate-400">{icon}</span>
        {children}
      </div>
    </div>
  );
}

function AuthError({ message }: { message: string }) {
  return (
    <div id="auth-error" role="alert" aria-live="assertive" className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold leading-5 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
