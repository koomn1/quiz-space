import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, Sparkles, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { EmailVerificationStep } from './EmailVerificationStep';
import { isStrongPassword, passwordRequirementMessage } from '../lib/passwordPolicy';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess?: (user: any, token?: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login', onSuccess }) => {
  const { signIn, signUp, verifyMfaCode } = useAuth();
  
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync mode when initialMode changes or modal reopens
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError('');
      setSuccess('');
      setStep('form');
    }
  }, [isOpen, initialMode]);

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

  // Two-Step Login MFA state
  const [step, setStep] = useState<'form' | 'email' | '2fa'>('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

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
        if (!isStrongPassword(cleanPassword)) {
          setError(passwordRequirementMessage('ar'));
          setLoading(false);
          return;
        }
        await signUp(cleanEmail, cleanPassword, cleanName);
        setSuccess('تم إرسال رمز التأكيد إلى بريدك الإلكتروني بنجاح!');
        setStep('email');
      } else {
        const result = await signIn(cleanEmail, cleanPassword);
        if (result.status === 'MFA_REQUIRED') {
          setStep('2fa');
          setLoading(false);
          return;
        }
        if (onSuccess) onSuccess(null);
        onClose();
      }
    } catch (err: any) {
      if (err?.code === 'EMAIL_NOT_CONFIRMED') {
        setStep('email');
      } else {
        setError(err.message || 'حدث خطأ غير متوقع أثناء عملية الدخول');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying2FA(true);
    setError('');
    try {
      await verifyMfaCode(verificationCode);
      if (onSuccess) onSuccess(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'رمز التحقق غير صحيح.');
    } finally {
      setIsVerifying2FA(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Animated Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-xl transition-opacity animate-in fade-in duration-500"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div 
        className="relative w-full max-w-md bg-white dark:bg-[#0c071e]/95 border border-slate-200 dark:border-white/10 rounded-[32px] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.3)] dark:shadow-[0_25px_60px_-15px_rgba(155,81,224,0.25)] overflow-hidden animate-in zoom-in-95 fade-in duration-300"
      >
        <div className="relative p-8">
          {/* Top Bar with Logo and Close */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1 px-2 py-1 bg-violet-500/10 rounded-full w-fit border border-violet-500/20">
                <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-300 uppercase tracking-wider">كوزمو كويز • AIQuiz</span>
              </div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-slate-900 via-primary to-violet-950 dark:from-white dark:via-purple-300 dark:to-slate-300 bg-clip-text text-transparent leading-none">
                {step === 'email'
                  ? 'تأكيد البريد الإلكتروني'
                  : step === '2fa'
                    ? 'خطوة التحقق الإضافية'
                    : (mode === 'login' ? 'مرحباً بعودتك' : 'انضم إلينا الآن')}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                {step === 'email'
                  ? 'أدخل الرمز المرسل إلى بريدك لتفعيل الحساب بأمان.'
                  : step === '2fa'
                    ? 'حسابك محمي بالمصادقة الثنائية. الرجاء إدخال الرمز السري من تطبيق التحقق.'
                    : (mode === 'login' ? 'سجل دخولك لمتابعة منجزاتك التعليمية فوراً' : 'أنشئ حساباً تفاعلياً جديداً لبدء المسيرة اليوم')}
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {step === 'email' ? (
            <EmailVerificationStep
              email={email.trim().toLowerCase()}
              lang="ar"
              onVerified={() => {
                if (onSuccess) onSuccess(null);
                onClose();
              }}
              onBack={() => {
                setStep('form');
                setError('');
                setSuccess('');
              }}
            />
          ) : step === '2fa' ? (
            <form onSubmit={handleMfaVerify} className="space-y-6">
              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    maxLength={6}
                    required
                    placeholder="000000"
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 text-center text-lg font-mono font-black tracking-[0.5em] text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary transition-all"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs font-bold text-red-400 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifying2FA || verificationCode.length !== 6}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isVerifying2FA ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                  <span>تأكيد الرمز</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-4">
                {mode === 'register' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">الاسم الكامل</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        placeholder="أحمد محمد..."
                        className="w-full pl-4 pr-11 py-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary/15 focus:border-primary text-sm transition-all dark:text-white outline-none font-medium placeholder:text-slate-400/80"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">البريد الإلكتروني</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="w-full pl-4 pr-11 py-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary/15 focus:border-primary text-sm transition-all dark:text-white outline-none font-medium placeholder:text-slate-400/80"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">كلمة المرور</label>
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
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      minLength={mode === 'register' ? 10 : 1}
                      aria-describedby={mode === 'register' ? 'signup-password-help' : undefined}
                      className="w-full pl-4 pr-11 py-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary/15 focus:border-primary text-sm transition-all dark:text-white outline-none font-medium placeholder:text-slate-400/80"
                    />
                  </div>
                  {mode === 'register' && <p id="signup-password-help" className="px-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">استخدم 10 أحرف على الأقل، مع حرف صغير وحرف كبير ورقم واحد.</p>}
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs font-bold text-red-400 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs font-bold text-emerald-400 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{success}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                  <span>{mode === 'login' ? 'دخول سريع' : 'بدء التعلم الآن'}</span>
                </button>
              </div>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-primary transition-colors"
                >
                  {mode === 'login' ? 'ليس لديك حساب؟ سجل الآن مجاناً' : 'لديك حساب بالفعل؟ سجل دخولك'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
