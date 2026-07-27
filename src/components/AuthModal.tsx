import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, Sparkles, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'register';
  onSuccess?: (user: any, token: string) => void;
}

export default function AuthModal({ isOpen, onClose, mode: initialMode, onSuccess }: AuthModalProps) {
  const { signUp, signIn, verifyMfaCode } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Lock background scroll when AuthModal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Two-Step Login MFA state - AuthContext's mfaRequired flag mirrors this once signIn()
  // reports MFA_REQUIRED, so this local `step` just drives which form is shown.
  const [step, setStep] = useState<'form' | '2fa'>('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;
    const cleanName = username.trim();

    try {
      if (mode === 'register') {
        if (!cleanName) {
          setError('عذراً! يرجى إدخال اسم مستخدم مميز للبدء.');
          setLoading(false);
          return;
        }
        await signUp(cleanEmail, cleanPassword, cleanName);
        onClose();
      } else {
        const result = await signIn(cleanEmail, cleanPassword);
        if (result.status === 'MFA_REQUIRED') {
          setStep('2fa');
          setLoading(false);
          return;
        }
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع أثناء عملية الدخول');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.length !== 6) {
      setError('رمز التحقق يجب أن يكون مكوناً من 6 أرقام.');
      return;
    }
    setIsVerifying2FA(true);
    setError('');

    try {
      await verifyMfaCode(verificationCode);
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل التحقق من المصادقة الثنائية.');
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      // Supabase's OAuth flow redirects the whole page (no popup API like Firebase's
      // signInWithPopup) - onClose() isn't needed here since the page navigates away
      // and the modal unmounts; the session picks up automatically on return via
      // onAuthStateChange in AuthContext.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + (import.meta.env.BASE_URL || '/'),
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'فشلت عملية المتابعة باستخدام حساب Google');
      setLoading(false);
    }
  };

  return (
        <>
          {isOpen && (
        <div
          
          
          
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl overflow-y-auto"
        >
          {/* Main Card with clipped rounded corners to prevent overflow/triangle bugs */}
          <div
            
            
            
            
            className="w-full max-w-md relative overflow-hidden rounded-[2.5rem] border border-white/10 dark:border-slate-800 bg-white/95 dark:bg-[#0c071e] shadow-[0_25px_60px_-15px_rgba(155,81,224,0.3)] my-auto"
            dir="rtl"
          >
            {/* Interactive floating glowing neon contours */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-gradient-to-tr from-primary/30 to-violet-500/30 rounded-full blur-[45px] pointer-events-none animate-pulse" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-gradient-to-tr from-indigo-500/20 to-purple-500/30 rounded-full blur-[45px] pointer-events-none animate-pulse" />

            {/* Premium Glowing neon border effect */}
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-90 shadow-[0_0_20px_rgba(155,81,224,0.8)]" />

            <div className="relative p-8 space-y-6 sm:space-y-7">
              
              {/* Top Row: Brand Info and Close Trigger */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1 text-primary text-xs font-black tracking-wider mb-1.5 uppercase">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                    <span>كوزمو كويز • CosmoQuiz</span>
                  </div>
                  <h2 className="text-2xl font-black bg-gradient-to-r from-slate-900 via-primary to-violet-950 dark:from-white dark:via-purple-300 dark:to-slate-300 bg-clip-text text-transparent leading-none">
                    {step === '2fa' 
                      ? 'خطوة التحقق الإضافية 🛡️' 
                      : (mode === 'login' ? 'مرحباً بعودتك! 👋' : 'انضم إلينا الآن 🚀')}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                    {step === '2fa' 
                      ? 'حسابك محمي بالمصادقة الثنائية. الرجاء إدخال الرمز السري من تطبيق التحقق.' 
                      : (mode === 'login' ? 'سجل دخولك لمتابعة منجزاتك التعليمية فوراً' : 'أنشئ حساباً تفاعلياً جديداً لبدء المسيرة اليوم')}
                  </p>
                </div>
                <button 
                  onClick={onClose} 
                  className="p-2.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-500 dark:text-slate-400 rounded-full transition-all hover:rotate-90 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {step === '2fa' ? (
                /* TWO STEP LOGIN OTP FORM */
                <form 
                  
                  
                  
                  onSubmit={handleVerify2FA} 
                  className="space-y-5"
                >
                  <div className="space-y-2 text-center">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                      <ShieldCheck className="w-6 h-6 text-violet-400" />
                    </div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      رمز التحقق المكون من 6 أرقام:
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000 000"
                      className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 text-center text-lg font-mono font-black tracking-[0.5em] text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary transition-all"
                    />
                  </div>

                  {error && (
                    <div 
                       
                      
                      className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-3 rounded-2xl border border-rose-100 dark:border-rose-500/20 flex items-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0 animate-ping" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isVerifying2FA}
                    className="relative w-full py-3.5 bg-gradient-to-r from-primary to-violet-600 hover:from-primary-hover hover:to-violet-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed overflow-hidden group cursor-pointer"
                  >
                    <span className="relative flex items-center justify-center gap-2">
                      {isVerifying2FA ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>جاري التحقق من الهوية...</span>
                        </>
                      ) : (
                        <span>تأكيد الهوية والمتابعة</span>
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep('form');
                      setVerificationCode('');
                      setError('');
                    }}
                    className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center gap-1 hover:underline transition-all cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>العودة لشاشة الدخول</span>
                  </button>
                </form>
              ) : (
                /* STANDARD SIGNIN / SIGNUP FORM */
                <>
                  <form onSubmit={handleAuth} className="space-y-4">
                    {/* Dynamically sliding Name Field for signup mode only */}
                    
                      {mode === 'register' && (
                        <div
                          
                          
                          
                          
                          
                          className="space-y-1.5 overflow-hidden"
                        >
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 px-1">اسم المستخدم</label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                              <UserIcon className="w-5 h-5" />
                            </div>
                            <input
                              type="text"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              required={mode === 'register'}
                              placeholder="مثال: أحمد الغامدي"
                              className="w-full pl-4 pr-11 py-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary/15 focus:border-primary text-sm transition-all dark:text-white outline-none font-medium placeholder:text-slate-400/80"
                            />
                          </div>
                        </div>
                      )}
                    

                    {/* Email Address */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 px-1">البريد الإلكتروني</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                          <Mail className="w-5 h-5" />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          placeholder="name@example.com"
                          className="w-full pl-4 pr-11 py-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary/15 focus:border-primary text-sm transition-all dark:text-white outline-none font-medium placeholder:text-slate-400/80"
                        />
                      </div>
                    </div>

                    {/* Secure Password */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 px-1">كلمة المرور</label>
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
                          className="w-full pl-4 pr-11 py-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary/15 focus:border-primary text-sm transition-all dark:text-white outline-none font-medium placeholder:text-slate-400/80"
                        />
                      </div>
                    </div>

                    {/* Error Banner with beautiful alert styling */}
                    
                      {error && (
                        <div 
                           
                           
                          
                          className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-3 rounded-2xl border border-rose-100 dark:border-rose-500/20 flex items-center gap-2"
                        >
                          <div className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0 animate-ping" />
                          <span>{error}</span>
                        </div>
                      )}
                    

                    {/* Submission Action button with high quality feedback */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="relative w-full py-3.5 bg-gradient-to-r from-primary to-violet-600 hover:from-primary-hover hover:to-violet-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed overflow-hidden group cursor-pointer"
                    >
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                      <span className="relative flex items-center justify-center gap-2">
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>جاري التحقق والمتابعة...</span>
                          </>
                        ) : (
                          <span>{mode === 'login' ? 'تسجيل دخول متميز' : 'إنشاء حساب جديد'}</span>
                        )}
                      </span>
                    </button>
                  </form>

                  {/* Decorative Separator */}
                  <div className="relative flex items-center py-1">
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-800/80"></div>
                    <span className="flex-shrink-0 mx-4 text-[10px] font-black uppercase tracking-widest text-slate-400">أو المتابعة السريعة عبر</span>
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-800/80"></div>
                  </div>

                  {/* Social Login triggers */}
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full py-3.5 flex items-center justify-center gap-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all shadow-sm group cursor-pointer"
                  >
                    <svg className="w-5 h-5 transition-transform group-hover:scale-110 duration-250" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">الدخول السريع بحساب Google</span>
                  </button>
                  
                  {/* Toggle Trigger */}
                  <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {mode === 'login' ? 'عضو جديد في المنصة؟ ' : 'لديك حساب مسجل بالفعل؟ '}
                      <button 
                        type="button"
                        onClick={() => {
                          setMode(mode === 'login' ? 'register' : 'login');
                          setError('');
                        }} 
                        className="text-primary font-black hover:underline cursor-pointer transition-colors hover:text-violet-500 mr-1"
                      >
                        {mode === 'login' ? 'أنشئ حسابك الآن' : 'سجل دخولك'}
                      </button>
                    </p>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}
    
    </>
  );
}