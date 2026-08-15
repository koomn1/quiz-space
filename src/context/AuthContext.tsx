import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getDefaultAvatar } from '../constants/profileAssets';
import type { Session, User } from '@supabase/supabase-js';
import { isStrongPassword, passwordRequirementMessage } from '../lib/passwordPolicy';
import { getAuthRedirectUrl } from '../lib/authRedirect';

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  photoURL?: string;
  customId?: string;
  isPremium?: boolean;
  planName?: string;
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  loading: boolean;
  // MFA (2FA) - uses Supabase's built-in TOTP MFA, not a hand-rolled implementation.
  mfaRequired: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ status: 'SUCCESS' | 'MFA_REQUIRED' }>;
  signInWithGoogle: () => Promise<void>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  resendEmailVerification: (email: string) => Promise<void>;
  verifyMfaCode: (code: string) => Promise<void>;
  enrollMfa: () => Promise<{ qrCode: string; secret: string; factorId: string }>;
  confirmMfaEnrollment: (factorId: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchAppUser(authUser: User): Promise<AppUser> {
  const metaName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.user_metadata?.preferred_username || (authUser.email ? authUser.email.split('@')[0] : '') || 'طالب متميز';
  const metaPhoto = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || '';

  let { data } = await supabase.from('users').select('*').eq('uid', authUser.id).single();

  let resolvedName = data?.name;
  if (!resolvedName || resolvedName === 'طالب متميز') {
    resolvedName = metaName;
  }

  if (!data) {
    const { data: existing } = await supabase.from('users').select('uid').eq('uid', authUser.id).maybeSingle();
    if (!existing) {
      const newUser = {
        uid: authUser.id,
        email: authUser.email || '',
        name: resolvedName,
        photo_url: metaPhoto,
        plan_name: 'Free',
        is_premium: false,
      };
      const { error: insertError } = await supabase.from('users').insert(newUser);
      if (insertError) {
        console.error('Failed to create users row after sign-up for', authUser.id, insertError);
      } else {
        const { data: freshData } = await supabase.from('users').select('*').eq('uid', authUser.id).single();
        if (freshData) data = freshData;
      }
    } else {
      const { data: freshData } = await supabase.from('users').select('*').eq('uid', authUser.id).single();
      if (freshData) data = freshData;
    }
  } else if ((!data.name || data.name === 'طالب متميز') && metaName && metaName !== 'طالب متميز') {
    const { error: updateError } = await supabase.from('users').update({ name: metaName, photo_url: data.photo_url || metaPhoto }).eq('uid', authUser.id);
    if (updateError) {
      console.error('Failed to sync name/photo from auth metadata for', authUser.id, updateError);
    } else {
      // Re-fetch to reflect the updated name/photo in the returned object.
      const { data: freshData } = await supabase.from('users').select('*').eq('uid', authUser.id).single();
      if (freshData) {
        data = freshData;
        resolvedName = freshData.name || resolvedName;
      }
    }
  }

  // Ensure every user has at least a default avatar
  let finalPhotoURL = data?.photo_url || metaPhoto;
  if (!finalPhotoURL || finalPhotoURL === '') {
    // Assign default avatar if none exists (email/password users or first-time)
    // getDefaultAvatar already returns the full path with BASE_URL prefix
    finalPhotoURL = getDefaultAvatar(resolvedName);
    // Save it to the DB for persistence
    await supabase.from('users').update({ photo_url: finalPhotoURL }).eq('uid', authUser.id);
  }

  return {
    uid: authUser.id,
    email: authUser.email || '',
    name: resolvedName,
    photoURL: finalPhotoURL,
    customId: data?.custom_id || '',
    isPremium: data?.is_premium || false,
    planName: data?.plan_name || 'Free',
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);

  useEffect(() => {
    const syncSession = async (nextSession: Session | null) => {
      const nextUser = nextSession?.user;
      if (nextUser && !nextUser.email_confirmed_at) {
        await supabase.auth.signOut({ scope: 'local' });
        setSession(null);
        setUser(null);
        return;
      }
      setSession(nextSession);
      setUser(nextUser ? await fetchAppUser(nextUser) : null);
    };

    const handleOAuthRedirectTokens = async () => {
      const callbackUrl = new URL(window.location.href);
      const authorizationCode = callbackUrl.searchParams.get('code');
      if (authorizationCode) {
        const { error } = await supabase.auth.exchangeCodeForSession(authorizationCode);
        callbackUrl.searchParams.delete('code');
        window.history.replaceState({}, document.title, `${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`);
        if (error) return;
      }
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          window.location.hash = '#/dashboard/landing';
        }
      }
    };

    handleOAuthRedirectTokens().then(() => {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        await syncSession(session);
        setLoading(false);
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      await syncSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    if (!isStrongPassword(password)) {
      throw new Error(passwordRequirementMessage('ar'));
    }

    const redirectTo = getAuthRedirectUrl(window.location.origin, import.meta.env.BASE_URL || '/');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      throw new Error('تعذر بدء التسجيل حالياً. تأكد من البيانات وحاول مرة أخرى.');
    }

    if (!data.user || data.session || data.user.email_confirmed_at) {
      await supabase.auth.signOut({ scope: 'local' });
      throw new Error('تعذر بدء تأكيد البريد حالياً. حاول مرة أخرى لاحقاً.');
    }
  };

  const verifyEmailCode = async (_email: string, _code: string) => {
    // Deprecated in link-based flow
  };

  const resendEmailVerification = async (email: string) => {
    const redirectTo = getAuthRedirectUrl(window.location.origin, import.meta.env.BASE_URL || '/');

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    if (error) {
      throw new Error('تعذر إرسال رمز جديد الآن. انتظر قليلاً ثم حاول مرة أخرى.');
    }
  };

  const signIn = async (email: string, password: string): Promise<{ status: 'SUCCESS' | 'MFA_REQUIRED' }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut({ scope: 'local' });
      const unconfirmedError = new Error('بريدك الإلكتروني غير مؤكد. يرجى الضغط على رابط التأكيد المرسل إلى بريدك.') as Error & { code?: string };
      unconfirmedError.code = 'EMAIL_NOT_CONFIRMED';
      throw unconfirmedError;
    }

    // Check if this session needs a second MFA factor (Supabase's native AAL system).
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
      setMfaRequired(true);
      return { status: 'MFA_REQUIRED' };
    }
    return { status: 'SUCCESS' };
  };

  const signInWithGoogle = async () => {
    const redirectTo = getAuthRedirectUrl(window.location.origin, import.meta.env.BASE_URL || '/');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      throw new Error('تعذر فتح تسجيل الدخول بجوجل. تحقق من تفعيل مزود Google ثم حاول مرة أخرى.');
    }
  };

  const verifyMfaCode = async (code: string) => {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactor = factors?.totp?.[0];
    if (!totpFactor) throw new Error('لم يتم العثور على عامل التحقق الثنائي.');

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
    if (challengeError) throw new Error(challengeError.message);

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challenge.id,
      code,
    });
    if (verifyError) throw new Error('كود التحقق غير صحيح أو منتهي الصلاحية.');
    setMfaRequired(false);
  };

  const enrollMfa = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (error) throw new Error(error.message);
    return { qrCode: data.totp.qr_code, secret: data.totp.secret, factorId: data.id };
  };

  const confirmMfaEnrollment = async (factorId: string, code: string) => {
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) throw new Error(challengeError.message);
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    if (error) throw new Error('كود التحقق غير صحيح.');
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!user && !mfaRequired,
        loading,
        mfaRequired,
        signUp,
        signIn,
        signInWithGoogle,
        verifyEmailCode,
        resendEmailVerification,
        verifyMfaCode,
        enrollMfa,
        confirmMfaEnrollment,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
