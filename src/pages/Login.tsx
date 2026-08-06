import React, { useState, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Mail, Lock, ShieldCheck, ArrowRight, RefreshCw, Sparkles, User, LogIn, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const { signIn, signUp, verifyMfaCode, mfaRequired } = useAuth();
  
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<'ar' | 'en'>(() => {
    return (localStorage.getItem('quiz_language') as 'ar' | 'en') || 'ar';
  });

  const isAr = lang === 'ar';

  const handleToggleLang = () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    localStorage.setItem('quiz_language', nextLang);
    document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = nextLang;
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + (import.meta.env.BASE_URL || '/'),
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || (isAr ? 'فشلت عملية تسجيل الدخول بجوجل' : 'Google sign-in failed'));
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    
    try {
      if (isRegister) {
        if (!username.trim()) {
          setError(isAr ? 'يرجى إدخال اسم مستخدم مميز للبدء.' : 'Username is required.');
          setLoading(false);
          return;
        }

        await signUp(cleanEmail, password, username.trim());
        // Login immediately after register
        await signIn(cleanEmail, password);
        window.location.hash = '#/dashboard/landing';
      } else {
        // Handle login with Supabase simulator (checks and prompts for 2FA automatically)
        const result = await signIn(cleanEmail, password);
        if (result.status === 'SUCCESS') {
          // Route immediately to dashboard (Scenario A)
          window.location.hash = '#/dashboard/landing';
        }
        // Scenario B (MFA Enabled) will automatically set isMfaChallenged = true in useAuth
      }
    } catch (err: any) {
      setError(err.message || (isAr ? 'حدث خطأ غير متوقع أثناء الدخول.' : 'An error occurred during authentication.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError(isAr ? 'رمز التحقق يجب أن يكون مكوناً من 6 أرقام.' : 'Verification code must be 6 digits.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await verifyMfaCode(otpCode);
      // Route immediately to dashboard on successful verification
      window.location.hash = '#/dashboard/landing';
    } catch (err: any) {
      setError(err.message || (isAr ? 'رمز التحقق غير صحيح أو منتهي الصلاحية.' : 'Invalid or expired code.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full bg-[#070412] text-white flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans select-none"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Dynamic atmospheric orbits in background */}
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse" />

      {/* Floating Header Actions */}
      <div className="absolute top-6 inset-x-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-1.5 text-xs font-black tracking-widest text-primary/80 uppercase">
          <Sparkles className="w-4 h-4 text-violet-400 animate-spin-slow" />
          <span>كوزمو كويز • CosmoQuiz</span>
        </div>
        <button
          onClick={handleToggleLang}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-black transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          {isAr ? 'English 🇺🇸' : 'العربية 🇸🇦'}
        </button>
      </div>

      <div className="w-full max-w-md relative z-10">
        
          {!mfaRequired ? (
            /* Standard Auth form */
            <div
              
              
              
              
              
              className="bg-[#0c071e]/90 border border-white/10 rounded-[32px] p-8 shadow-[0_25px_60px_-15px_rgba(155,81,224,0.25)] relative overflow-hidden"
            >
              {/* Premium Top Glow Border */}
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

              <div className="text-center mb-6">
                <h2 className="text-3xl font-black bg-gradient-to-r from-white via-purple-300 to-slate-300 bg-clip-text text-transparent">
                  {isRegister 
                    ? (isAr ? 'انضم للمنصة الأكاديمية 🚀' : 'Create Your Space Orbit 🚀') 
                    : (isAr ? 'مرحباً بعودتك! 👋' : 'Welcome Back Scholar! 👋')}
                </h2>
                <p className="text-xs text-slate-400 mt-2 font-medium">
                  {isRegister 
                    ? (isAr ? 'أنشئ حساباً مجانياً لبدء رحلة التحدي والتعلم' : 'Create a free workspace account to log achievements') 
                    : (isAr ? 'سجل دخولك فوراً للمتابعة وحصد الأوسمة' : 'Login to pursue interactive quizzes and climb ranks')}
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {isRegister && (
                  <div
                    
                    
                    className="space-y-1.5 overflow-hidden"
                  >
                    <label className="block text-xs font-bold text-slate-300 px-1">
                      {isAr ? 'اسم المستخدم' : 'Username'}
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required={isRegister}
                        placeholder={isAr ? 'مثال: أحمد الدوسري' : 'e.g., Alex Scholar'}
                        className="w-full pl-4 pr-11 py-3.5 bg-slate-900/40 border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/15 focus:border-primary text-sm transition-all text-white outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 px-1">
                    {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="scholar@space.edu"
                      className="w-full pl-4 pr-11 py-3.5 bg-slate-900/40 border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/15 focus:border-primary text-sm transition-all text-white outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 px-1">
                    {isAr ? 'كلمة المرور' : 'Password'}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-4 pr-11 py-3.5 bg-slate-900/40 border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/15 focus:border-primary text-sm transition-all text-white outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <div
                    
                    
                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs font-bold text-red-400 flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0 animate-ping" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-primary to-violet-600 hover:from-primary-hover hover:to-violet-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span>{isRegister ? (isAr ? 'إنشاء حساب جديد' : 'Register Orbit') : (isAr ? 'تسجيل الدخول' : 'Sign In')}</span>
                </button>
              </form>

              {/* Google OAuth Separator */}
              <div className="relative flex items-center py-3 mt-4">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {isAr ? 'أو المتابعة عبر' : 'or continue with'}
                </span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              {/* Google Sign-In Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3.5 flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all shadow-sm group cursor-pointer"
              >
                <svg className="w-5 h-5 transition-transform group-hover:scale-110 duration-250" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="text-sm font-black text-slate-200">
                  {isAr ? 'الدخول بحساب Google' : 'Sign in with Google'}
                </span>
              </button>

              <div className="mt-4 pt-4 border-t border-white/5 text-center">
                <button
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError('');
                  }}
                  className="text-xs text-primary font-black hover:underline cursor-pointer"
                >
                  {isRegister 
                    ? (isAr ? 'لديك حساب بالفعل؟ سجل دخولك' : 'Already have an orbit? Sign in') 
                    : (isAr ? 'مستخدم جديد؟ أنشئ حسابك الآن' : 'New to CosmoQuiz? Register here')}
                </button>
              </div>
            </div>
          ) : (
            /* Multi-factor authentication View (Scenario B) */
            <div
              
              
              
              
              
              className="bg-[#0c071e]/90 border border-white/10 rounded-[32px] p-8 shadow-[0_25px_60px_-15px_rgba(155,81,224,0.25)] relative overflow-hidden text-center"
            >
              {/* Premium Top Glow Border */}
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
                <ShieldCheck className="w-8 h-8 text-violet-400 animate-pulse" />
              </div>

              <h2 className="text-2xl font-black bg-gradient-to-r from-white via-purple-300 to-slate-300 bg-clip-text text-transparent">
                {isAr ? 'المصادقة الثنائية النشطة 🛡️' : 'MFA Authentication Required 🛡️'}
              </h2>
              <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                {isAr 
                  ? 'تم حماية هذا الحساب عبر المصادقة الثنائية. يرجى إدخال الرمز السري المكون من 6 أرقام من تطبيق التحقق لمتابعة تسجيل الدخول.'
                  : 'Your account is secured with two-factor locks. Please enter the 6-digit TOTP code from your authenticator app.'}
              </p>

              <form onSubmit={handleVerify2FA} className="space-y-5 mt-6">
                <div className="space-y-2">
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000 000"
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-3 text-center text-xl font-mono font-black tracking-[0.4em] text-white outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                </div>

                {error && (
                  <div
                    
                    
                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs font-bold text-red-400 flex items-center justify-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0 animate-ping" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-3.5 bg-gradient-to-r from-primary to-violet-600 hover:from-primary-hover hover:to-violet-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>{isAr ? 'تأكيد الرمز والمتابعة' : 'Verify and Confirm'}</span>
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  window.location.reload();
                }}
                className="mt-6 text-xs text-slate-500 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 mx-auto hover:underline"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>{isAr ? 'العودة لصفحة الدخول' : 'Back to Login Screen'}</span>
              </button>
            </div>
          )}
        
      </div>
    </div>
  );
}
