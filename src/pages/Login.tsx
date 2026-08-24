import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronLeft,
  Lock,
  LogIn,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { EmailVerificationStep } from '../components/EmailVerificationStep';
import { isStrongPassword, passwordRequirementMessage } from '../lib/passwordPolicy';
import { getAuthRedirectUrl } from '../lib/authRedirect';

const APP_BASE_URL = import.meta.env.BASE_URL || '/';

export default function Login() {
  const { signIn, signUp, verifyMfaCode, mfaRequired } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authStep, setAuthStep] = useState<'form' | 'email'>('form');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<'ar' | 'en'>(() => {
    return (localStorage.getItem('quiz_language') as 'ar' | 'en') || 'ar';
  });

  const isAr = lang === 'ar';

  useEffect(() => {
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('quiz_language', lang);
  }, [isAr, lang]);

  const handleToggleLang = () => {
    setLang((current) => current === 'ar' ? 'en' : 'ar');
  };

  const goHome = () => {
    window.location.hash = '#/';
  };

  const resetFormState = () => {
    setAuthStep('form');
    setError('');
    setOtpCode('');
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getAuthRedirectUrl(window.location.origin, import.meta.env.BASE_URL || '/'),
        },
      });
      if (oauthError) throw oauthError;
    } catch (err: any) {
      setError(err.message || (isAr ? 'فشلت عملية تسجيل الدخول بجوجل.' : 'Google sign-in failed.'));
      setLoading(false);
    }
  };

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (isRegister) {
        if (!username.trim()) {
          setError(isAr ? 'أدخل اسم المستخدم للبدء.' : 'Enter a username to continue.');
          setLoading(false);
          return;
        }

        if (!isStrongPassword(password)) {
          setError(passwordRequirementMessage(lang));
          setLoading(false);
          return;
        }

        await signUp(cleanEmail, password, username.trim());
        setAuthStep('email');
      } else {
        const result = await signIn(cleanEmail, password);
        if (result.status === 'SUCCESS') {
          window.location.hash = '#/dashboard/landing';
        }
      }
    } catch (err: any) {
      if (err?.code === 'EMAIL_NOT_CONFIRMED') {
        setAuthStep('email');
      } else {
        setError(err.message || (isAr ? 'حدث خطأ أثناء تسجيل الدخول.' : 'Something went wrong while signing in.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (event: React.FormEvent) => {
    event.preventDefault();
    if (otpCode.length !== 6) {
      setError(isAr ? 'رمز التحقق يجب أن يتكون من 6 أرقام.' : 'The verification code must contain 6 digits.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await verifyMfaCode(otpCode);
      window.location.hash = '#/dashboard/landing';
    } catch (err: any) {
      setError(err.message || (isAr ? 'رمز التحقق غير صحيح أو منتهي الصلاحية.' : 'Invalid or expired verification code.'));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsRegister((current) => !current);
    resetFormState();
  };

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#070b18] px-4 py-5 text-slate-900 sm:px-6 lg:px-10"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage: 'linear-gradient(rgba(148,163,184,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.055) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
          maskImage: 'linear-gradient(to bottom, black, transparent 90%)',
        }}
      />
      <div className="pointer-events-none absolute -right-40 top-20 h-[28rem] w-[28rem] rounded-full bg-violet-600/20 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-52 -left-40 h-[30rem] w-[30rem] rounded-full bg-cyan-500/10 blur-[140px]" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between">
        <button
          type="button"
          onClick={goHome}
          className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 text-xs font-bold text-white/75 transition-colors duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/80"
          aria-label={isAr ? 'العودة إلى الصفحة الرئيسية' : 'Return to the home page'}
        >
          <ChevronLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
          <span>{isAr ? 'الصفحة الرئيسية' : 'Home'}</span>
        </button>

        <div className="flex items-center gap-2.5">
          <img
            src={`${APP_BASE_URL}brand/quizspace-logo-512.webp`}
            alt="Quiz Space"
            className="h-9 w-9 rounded-xl object-cover shadow-lg shadow-violet-950/30"
          />
          <span className="hidden text-sm font-black tracking-tight text-white sm:inline">Quiz Space</span>
          <button
            type="button"
            onClick={handleToggleLang}
            className="min-h-11 rounded-full border border-white/10 bg-white/[0.06] px-3.5 text-xs font-bold text-white/75 transition-colors duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/80"
            aria-label={isAr ? 'تغيير لغة الواجهة إلى الإنجليزية' : 'Switch interface language to Arabic'}
          >
            {isAr ? 'English' : 'العربية'}
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-5.5rem)] w-full max-w-6xl items-center gap-10 py-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-16 lg:py-16">
        <section className="order-2 flex flex-col justify-center lg:order-1">
          <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-violet-300/15 bg-violet-300/[0.08] px-3.5 py-2 text-[11px] font-black tracking-wide text-violet-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_0_4px_rgba(103,232,249,0.12)]" aria-hidden="true" />
            {isAr ? 'منصة تعلم ذكية بالعربية' : 'A smarter learning space'}
          </div>

          <h1 className="max-w-xl text-4xl font-black leading-[1.18] tracking-tight text-white sm:text-5xl lg:text-[4.35rem]">
            {isAr ? (
              <>رحلتك تبدأ من <span className="bg-gradient-to-l from-cyan-200 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">سؤال.</span></>
            ) : (
              <>Your journey starts with a <span className="bg-gradient-to-r from-cyan-200 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">question.</span></>
            )}
          </h1>
          <p className="mt-6 max-w-lg text-sm leading-8 text-slate-300/80 sm:text-base">
            {isAr
              ? 'احفظ اختباراتك، تابع تقدمك، وخلي الذكاء الاصطناعي يساعدك تذاكر بطريقة أذكى وأوضح.'
              : 'Save your quizzes, track your progress, and let AI make the way you learn clearer and more personal.'}
          </p>

          <div className="mt-9 grid max-w-lg gap-3 sm:grid-cols-3">
            {[
              { icon: Sparkles, ar: 'توليد ذكي', en: 'AI generation' },
              { icon: ShieldCheck, ar: 'بيانات محفوظة', en: 'Safe progress' },
              { icon: Check, ar: 'تقدم واضح', en: 'Clear progress' },
            ].map(({ icon: Icon, ar, en }) => (
              <div key={en} className="rounded-2xl border border-white/10 bg-white/[0.055] p-3.5 backdrop-blur-sm">
                <Icon className="h-4 w-4 text-cyan-200" aria-hidden="true" />
                <p className="mt-2 text-[11px] font-bold text-white/80">{isAr ? ar : en}</p>
              </div>
            ))}
          </div>

          <div className="relative mt-10 hidden max-w-lg overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.1] to-white/[0.025] p-5 shadow-2xl shadow-violet-950/20 sm:block">
            <div className="absolute -left-12 -top-16 h-40 w-40 rounded-full border border-cyan-200/20" />
            <div className="absolute -left-5 -top-9 h-28 w-28 rounded-full border border-violet-200/20" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/70">Cosmo signal</p>
                <p className="mt-2 text-sm font-black text-white">{isAr ? 'مساحتك الخاصة للتعلّم' : 'Your personal learning orbit'}</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-950/40">
                <Sparkles className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2">
              {[0.35, 0.55, 0.82, 0.66, 0.94, 0.72, 0.88].map((height, index) => (
                <span key={index} className="h-1.5 flex-1 rounded-full bg-white/10">
                  <span className="block h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400" style={{ width: `${height * 100}%` }} />
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="order-1 lg:order-2">
          <div className="mx-auto w-full max-w-[29rem] rounded-[2rem] border border-white/70 bg-white p-5 shadow-[0_30px_90px_-35px_rgba(167,139,250,0.8)] sm:p-8">
            {authStep === 'email' ? (
              <EmailVerificationStep
                email={email.trim().toLowerCase()}
                lang={lang}
                onVerified={() => { window.location.hash = '#/dashboard/landing'; }}
                onBack={() => {
                  setAuthStep('form');
                  setError('');
                }}
              />
            ) : !mfaRequired ? (
              <div dir={isAr ? 'rtl' : 'ltr'}>
                <div className="mb-7 flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                      <LogIn className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                      {isRegister ? (isAr ? 'أنشئ حسابك' : 'Create your account') : (isAr ? 'أهلاً بعودتك' : 'Welcome back')}
                    </h2>
                    <p className="mt-2 text-xs leading-6 text-slate-500 sm:text-sm">
                      {isRegister
                        ? (isAr ? 'ابدأ مساحة تعلمك في أقل من دقيقة.' : 'Start your learning space in less than a minute.')
                        : (isAr ? 'سجّل الدخول لمتابعة اختباراتك وتقدمك.' : 'Sign in to continue your quizzes and progress.')}
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
                    {isRegister ? '01 / 02' : '01'}
                  </div>
                </div>

                <form onSubmit={handleAuth} className="space-y-4" noValidate>
                  {isRegister && (
                    <div className="space-y-2">
                      <label htmlFor="login-username" className="block px-1 text-xs font-black text-slate-700">
                        {isAr ? 'اسم المستخدم' : 'Username'}
                      </label>
                      <div className="relative">
                        <User className="pointer-events-none absolute inset-y-0 right-3.5 my-auto h-4.5 w-4.5 text-slate-400" aria-hidden="true" />
                        <input
                          id="login-username"
                          type="text"
                          value={username}
                          onChange={(event) => setUsername(event.target.value)}
                          required
                          autoComplete="name"
                          placeholder={isAr ? 'مثال: أحمد' : 'e.g. Alex'}
                          className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pl-4 pr-11 text-sm text-slate-950 outline-none transition duration-200 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="login-email" className="block px-1 text-xs font-black text-slate-700">
                      {isAr ? 'البريد الإلكتروني' : 'Email address'}
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute inset-y-0 right-3.5 my-auto h-4.5 w-4.5 text-slate-400" aria-hidden="true" />
                      <input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        autoComplete="email"
                        placeholder="name@example.com"
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? 'login-auth-error' : undefined}
                        className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pl-4 pr-11 text-sm text-slate-950 outline-none transition duration-200 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="login-password" className="block px-1 text-xs font-black text-slate-700">
                      {isAr ? 'كلمة المرور' : 'Password'}
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute inset-y-0 right-3.5 my-auto h-4.5 w-4.5 text-slate-400" aria-hidden="true" />
                      <input
                        id="login-password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        minLength={isRegister ? 10 : 1}
                        autoComplete={isRegister ? 'new-password' : 'current-password'}
                        aria-describedby={isRegister ? 'login-password-help' : error ? 'login-auth-error' : undefined}
                        placeholder="••••••••"
                        className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pl-4 pr-11 text-sm text-slate-950 outline-none transition duration-200 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                        dir="ltr"
                      />
                    </div>
                    {isRegister && (
                      <p id="login-password-help" className="px-1 text-[11px] leading-5 text-slate-500">
                        {passwordRequirementMessage(lang)}
                      </p>
                    )}
                  </div>

                  {error && (
                    <div id="login-auth-error" role="alert" aria-live="assertive" className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold leading-5 text-rose-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition-all duration-200 hover:bg-violet-700 hover:shadow-violet-700/20 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/25"
                  >
                    {loading ? <RefreshCw className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
                    <span>{isRegister ? (isAr ? 'إنشاء الحساب' : 'Create account') : (isAr ? 'تسجيل الدخول' : 'Sign in')}</span>
                  </button>
                </form>

                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-slate-200" />
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{isAr ? 'أو' : 'or'}</span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/15"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span>{isAr ? 'المتابعة بحساب Google' : 'Continue with Google'}</span>
                </button>

                <div className="mt-6 border-t border-slate-100 pt-5 text-center">
                  <button
                    type="button"
                    onClick={switchMode}
                    className="min-h-11 px-3 text-xs font-black text-violet-700 transition-colors duration-200 hover:text-violet-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30"
                  >
                    {isRegister
                      ? (isAr ? 'لديك حساب بالفعل؟ سجّل دخولك' : 'Already have an account? Sign in')
                      : (isAr ? 'مستخدم جديد؟ أنشئ حسابك الآن' : 'New here? Create an account')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center" dir={isAr ? 'rtl' : 'ltr'}>
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <ShieldCheck className="h-7 w-7" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  {isAr ? 'تأكيد إضافي للحساب' : 'Extra account verification'}
                </h2>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-slate-500">
                  {isAr
                    ? 'حسابك محمي بالمصادقة الثنائية. أدخل الرمز المكوّن من 6 أرقام من تطبيق التحقق للمتابعة.'
                    : 'Your account is protected with two-factor authentication. Enter the 6-digit code from your authenticator app.'}
                </p>

                <form onSubmit={handleVerify2FA} className="mt-7 space-y-4" noValidate>
                  <label htmlFor="login-mfa-code" className="sr-only">{isAr ? 'رمز المصادقة الثنائية' : 'Two-factor authentication code'}</label>
                  <input
                    id="login-mfa-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    autoFocus
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'login-auth-error' : undefined}
                    className="min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-center font-mono text-2xl font-black tracking-[0.4em] text-slate-950 outline-none transition duration-200 placeholder:text-slate-300 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                    dir="ltr"
                  />

                  {error && (
                    <div id="login-auth-error" role="alert" aria-live="assertive" className="flex items-start justify-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold leading-5 text-rose-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || otpCode.length !== 6}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition-all duration-200 hover:bg-violet-700 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/25"
                  >
                    {loading ? <RefreshCw className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                    <span>{isAr ? 'تأكيد الرمز والمتابعة' : 'Verify and continue'}</span>
                  </button>
                </form>

                <button
                  type="button"
                  onClick={goHome}
                  className="mt-5 inline-flex min-h-11 items-center gap-1.5 px-3 text-xs font-bold text-slate-500 transition-colors duration-200 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30"
                >
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
                  <span>{isAr ? 'العودة للصفحة الرئيسية' : 'Return home'}</span>
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
