import React, { useState, useEffect } from 'react';
import { Shield, Key, Laptop, AlertCircle, CheckCircle, RefreshCw, Smartphone } from 'lucide-react';
import { fetchWithAuth } from '../../lib/authFetch';
import { getApiUrl } from '../../lib/origin';
import { supabase } from '../../lib/supabaseClient';

interface SecurityProps {
  lang: 'ar' | 'en';
}

export default function Security({ lang }: SecurityProps) {
  const isAr = lang === 'ar';
  
  // State for change password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);

  // State for 2FA
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [twoFAFeedback, setTwoFAFeedback] = useState<string | null>(null); // 'setup' | 'success' | null
  const [enrollmentSecret, setEnrollmentSecret] = useState('');
  const [enrollmentQRCode, setEnrollmentQRCode] = useState('');
  const [errorMessage2FA, setErrorMessage2FA] = useState<string | null>(null);

  // Active Sessions Data
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // Fetch initial state
  const fetchSessions = async () => {
    try {
      const storedUid = typeof localStorage !== 'undefined' ? localStorage.getItem('quiz_userId') : null;
      if (!storedUid || storedUid.startsWith('user-')) {
        setIsLoadingSessions(false);
        return;
      }
      setIsLoadingSessions(true);
      const { data, error } = await supabase.auth.getSession();
      if (data.session) {
        setSessions([{
          id: data.session.access_token.substring(0, 16),
          device: navigator.userAgent,
          ip: 'Local Session',
          lastActive: new Date(data.session.expires_at ? data.session.expires_at * 1000 : Date.now()).toISOString(),
          current: true
        }]);
      } else {
        setSessions([]);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const fetch2FAStatus = async () => {
    try {
      const storedUid = typeof localStorage !== 'undefined' ? localStorage.getItem('quiz_userId') : null;
      if (!storedUid || storedUid.startsWith('user-')) {
        return;
      }
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (data && data.totp.length > 0) {
        setIs2FAEnabled(true);
      }
    } catch (err) {
      console.error('Failed to fetch 2FA status:', err);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetch2FAStatus();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordFeedback(isAr ? 'الرجاء ملء جميع الحقول المطلوبة.' : 'Please fill in all required fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback(isAr ? 'كلمة المرور الجديدة غير متطابقة.' : 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordFeedback(isAr ? 'يجب أن تكون كلمة المرور مكونة من 6 أحرف على الأقل.' : 'Password must be at least 6 characters.');
      return;
    }
    
    setIsChangingPassword(true);
    setPasswordFeedback(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        // Re-authenticate with the current password first (Supabase equivalent of Firebase's
        // reauthenticateWithCredential) - this confirms the caller actually knows the old
        // password before allowing the change, same security guarantee as before.
        const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
        if (reauthError) throw new Error(isAr ? 'كلمة المرور الحالية غير صحيحة.' : 'Current password is incorrect.');

        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        if (updateError) throw updateError;

        setPasswordFeedback('success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        throw new Error(isAr ? 'لم يتم العثور على مستخدم نشط.' : 'No active authenticated user found.');
      }
    } catch (err: any) {
      console.error('Password change failed:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPasswordFeedback(isAr ? 'كلمة المرور الحالية غير صحيحة.' : 'Current password is incorrect.');
      } else if (err.code === 'auth/requires-recent-login') {
        setPasswordFeedback(isAr ? 'يرجى تسجيل الخروج ثم الدخول مرة أخرى لإجراء هذه العملية الحساسة.' : 'Please log out and log in again to perform this security action.');
      } else {
        setPasswordFeedback(isAr ? 'فشل تحديث كلمة المرور. يرجى التأكد من الحقول والمحاولة لاحقاً.' : 'Failed to update password. Please check fields and retry.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleToggle2FA = async () => {
    setErrorMessage2FA(null);
    if (is2FAEnabled) {
      // Disable 2FA securely via backend
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (data && data.totp.length > 0) {
          const factorId = data.totp[0].id;
          const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
          if (unenrollError) throw unenrollError;
          setIs2FAEnabled(false);
          setTwoFAFeedback(null);
        }
      } catch (err) {
        console.error('Failed to disable 2FA:', err);
        setErrorMessage2FA(isAr ? 'خطأ في الاتصال بالخادم.' : 'Server connection error.');
      }
    } else {
      // Begin 2FA enrollment process
      try {
        const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
        if (data) {
          setEnrollmentSecret(data.totp.secret);
          setEnrollmentQRCode(data.totp.qr_code);
          setTwoFAFeedback('setup');
          localStorage.setItem('pending_mfa_factor_id', data.id);
        } else {
          setErrorMessage2FA(isAr ? 'فشل تهيئة إعداد المصادقة الثنائية.' : 'Failed to initialize 2FA enrollment.');
        }
      } catch (err) {
        console.error('Failed to enroll in 2FA:', err);
        setErrorMessage2FA(isAr ? 'خطأ في الاتصال بالخادم.' : 'Server connection error.');
      }
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.length !== 6) {
      setErrorMessage2FA(isAr ? 'رمز التحقق يجب أن يكون مكوناً من 6 أرقام.' : 'Verification code must be 6 digits.');
      return;
    }
    setIsVerifying2FA(true);
    setErrorMessage2FA(null);
    
    try {
      const factorId = localStorage.getItem('pending_mfa_factor_id');
      if (!factorId) throw new Error('No pending MFA enrollment.');
      
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      
      const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: verificationCode });
      if (error) throw error;
      
      setIs2FAEnabled(true);
      setTwoFAFeedback('success');
      setVerificationCode('');
      localStorage.removeItem('pending_mfa_factor_id');
    } catch (err) {
      console.error('Failed to verify 2FA:', err);
      setErrorMessage2FA(isAr ? 'خطأ في الاتصال بالخادم.' : 'Server connection error.');
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      if (sessions.find(s => s.id === sessionId && s.current)) {
        await supabase.auth.signOut();
        window.location.href = '/';
      }
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      console.error('Failed to revoke session:', err);
    }
  };

  const handleLogOutAll = async () => {
    try {
      setSessions(prev => prev.filter(s => s.current));
    } catch (err) {
      console.error('Failed to revoke other sessions:', err);
    }
  };

  const storedUid = typeof localStorage !== 'undefined' ? localStorage.getItem('quiz_userId') : null;
  const isGuest = !storedUid || storedUid.startsWith('user-');

  if (isGuest) {
    return (
      <div className="text-center py-12 px-6 bg-slate-50 dark:bg-slate-900/40 rounded-[28px] border border-slate-200/50 dark:border-slate-800/60 max-w-xl mx-auto space-y-5 animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto border border-primary/20">
          <Shield className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h4 className="font-black text-lg text-slate-800 dark:text-white">
            {isAr ? 'ميزات الأمان المتقدمة' : 'Advanced Security features'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {isAr 
              ? 'أنت تتصفح حالياً كحساب زائر مؤقت. يرجى إنشاء حساب رسمي أو تسجيل الدخول لتفعيل المصادقة الثنائية (2FA)، وإدارة الجلسات النشطة، وحماية حسابك بشكل كامل.'
              : 'You are currently browsing as a temporary guest. Please sign up or log in to enable Two-Factor Authentication (2FA), manage active sessions, and fully protect your profile.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in text-right" style={{ textAlign: isAr ? 'right' : 'left' }} dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* 1. Change Password Form */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white">
              {isAr ? 'تغيير كلمة المرور' : 'Change Password'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr ? 'قم بتحديث كلمة مرور حسابك بانتظام لتعزيز الأمان' : 'Regularly update your password to enhance account safety'}
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl bg-slate-50/50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
              {isAr ? 'كلمة المرور الحالية:' : 'Current Password:'}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                {isAr ? 'كلمة المرور الجديدة:' : 'New Password:'}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                {isAr ? 'تأكيد كلمة المرور الجديدة:' : 'Confirm New Password:'}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
              />
            </div>
          </div>

          {passwordFeedback === 'success' && (
            <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{isAr ? 'تم تغيير كلمة المرور بنجاح!' : 'Password changed successfully!'}</span>
            </div>
          )}

          {passwordFeedback && passwordFeedback !== 'success' && (
            <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordFeedback}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isChangingPassword}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-md shadow-primary/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isChangingPassword && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{isAr ? 'تحديث كلمة المرور' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Two-Factor Authentication (2FA) */}
      <div className="pt-8 border-t border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-500/10 rounded-xl text-violet-500">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white">
                {isAr ? 'المصادقة الثنائية (2FA)' : 'Two-Factor Authentication (2FA)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr ? 'حماية فائقة لحسابك عبر طلب رمز تحقق إضافي عند تسجيل الدخول' : 'Double your security by requiring an extra verification code at login'}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggle2FA}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${is2FAEnabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
          >
            <span className={`${is2FAEnabled ? (isAr ? '-translate-x-6' : 'translate-x-6') : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform`} />
          </button>
        </div>

        {/* Live Setup QR Code Panel */}
        {twoFAFeedback === 'setup' && (
          <div
            
            
            className="bg-slate-50/50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 max-w-xl space-y-4 overflow-hidden"
          >
            <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">
              {isAr ? '1. امسح رمز الاستجابة السريعة (QR Code) باستخدام تطبيق Google Authenticator:' : '1. Scan the QR code using Google Authenticator or Microsoft Authenticator:'}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-white dark:bg-slate-800 rounded-xl max-w-md border border-slate-200/50 dark:border-slate-700/50">
              {/* Actual QR Code container */}
              <div className="w-32 h-32 bg-white p-2 border-2 border-slate-100 rounded-lg flex items-center justify-center shrink-0 select-none relative shadow-sm">
                {enrollmentQRCode ? (
                  <img src={enrollmentQRCode} alt="MFA QR Code" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
              </div>
              
              <div className="space-y-1.5 text-center sm:text-right" style={{ textAlign: isAr ? 'right' : 'left' }}>
                <span className="text-[10px] font-black uppercase text-primary tracking-wider bg-primary/15 px-2 py-0.5 rounded-md">Quiz Space Vault</span>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'مفتاح التهيئة اليدوي:' : 'Manual Setup Secret:'}
                </p>
                <code className="block text-xs font-mono font-bold text-violet-500 bg-slate-50 dark:bg-slate-900/80 px-2.5 py-1 rounded border border-slate-150 dark:border-slate-800 select-all">
                  {enrollmentSecret || 'GENERATING...'}
                </code>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-bold pt-2">
              {isAr ? '2. أدخل الرمز المكون من 6 أرقام للتحقق والتأكيد:' : '2. Enter the 6-digit confirmation code from your app:'}
            </p>

            <form onSubmit={handleVerify2FA} className="flex gap-2 max-w-sm">
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000 000"
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-center font-mono font-bold tracking-widest text-slate-800 dark:text-white outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={isVerifying2FA}
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                {isVerifying2FA && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isAr ? 'تأكيد' : 'Verify'}</span>
              </button>
            </form>

            {errorMessage2FA && (
              <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20 max-w-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage2FA}</span>
              </div>
            )}
          </div>
        )}

        {is2FAEnabled && (
          <div className="mt-4 flex items-center gap-2 text-emerald-500 text-xs font-bold bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 max-w-xl">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{isAr ? 'تم تفعيل المصادقة الثنائية (2FA) بنجاح لحماية حسابك.' : 'Two-Factor Authentication (2FA) is active on your account.'}</span>
          </div>
        )}
      </div>

      {/* 3. Active Sessions Table */}
      <div className="pt-8 border-t border-slate-100 dark:border-slate-800/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white">
              {isAr ? 'الأجهزة المتصلة والجلسات النشطة' : 'Active Login Sessions'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr ? 'إدارة ومراجعة جميع الأجهزة التي سجلت الدخول حالياً لحسابك' : 'Manage and review currently signed-in devices'}
            </p>
          </div>

          {sessions.length > 1 && (
            <button
              onClick={handleLogOutAll}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white border border-red-500/20 rounded-xl transition-all font-bold text-xs cursor-pointer self-end sm:self-center"
            >
              {isAr ? 'تسجيل الخروج من كافة الأجهزة الأخرى' : 'Log out from all other devices'}
            </button>
          )}
        </div>

        {isLoadingSessions ? (
          <div className="flex items-center justify-center py-10">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
            <table className="w-full text-right" style={{ textAlign: isAr ? 'right' : 'left' }}>
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold">
                  <th className="px-5 py-3">{isAr ? 'الجهاز' : 'Device'}</th>
                  <th className="px-5 py-3">{isAr ? 'الموقع الجغرافي' : 'Location'}</th>
                  <th className="px-5 py-3 text-center">{isAr ? 'الحالة / الإجراء' : 'Status / Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300">
                {sessions.map((s) => (
                  <tr  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 shrink-0">
                          {s.device.toLowerCase().includes('iphone') || s.device.toLowerCase().includes('phone') || s.device.toLowerCase().includes('android') ? (
                            <Smartphone className="w-5 h-5" />
                          ) : (
                            <Laptop className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex flex-col text-left" style={{ textAlign: isAr ? 'right' : 'left' }}>
                          <span className="font-bold text-slate-800 dark:text-white text-sm">{s.device}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{s.ipAddress || 'IP: Unknown'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs">
                       <div className="flex flex-col text-left" style={{ textAlign: isAr ? 'right' : 'left' }}>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{s.location}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{s.lastActive || (isAr ? 'منذ فترة' : 'Recently')}</span>
                       </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {s.current ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full ring-1 ring-emerald-500/20">
                          {isAr ? 'الجلسة الحالية' : 'Current Session'}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRevokeSession(s.id)}
                          className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-extrabold text-red-500 transition-colors cursor-pointer"
                        >
                          {isAr ? 'إنهاء الجلسة' : 'Terminate Session'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
