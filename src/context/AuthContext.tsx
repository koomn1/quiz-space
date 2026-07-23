import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

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
    const newUser = {
      uid: authUser.id,
      email: authUser.email || '',
      name: resolvedName,
      photo_url: metaPhoto,
      plan_name: 'Free',
      is_premium: false,
      joined_date: new Date().toISOString()
    };
    try { await supabase.from('users').insert(newUser); } catch {}
  } else if ((!data.name || data.name === 'طالب متميز') && metaName && metaName !== 'طالب متميز') {
    try { await supabase.from('users').update({ name: metaName, photo_url: data.photo_url || metaPhoto }).eq('uid', authUser.id); } catch {}
  }

  return {
    uid: authUser.id,
    email: authUser.email || '',
    name: resolvedName,
    photoURL: data?.photo_url || metaPhoto,
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) setUser(await fetchAppUser(session.user));
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ? await fetchAppUser(session.user) : null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw new Error(error.message);
    if (data.user) {
      // Create the matching row in public.users (RLS policy allows insert where auth.uid() = uid).
      await supabase.from('users').insert({ uid: data.user.id, email, name, plan_name: 'Free', is_premium: false, joined_date: new Date().toISOString() });
    }
  };

  const signIn = async (email: string, password: string): Promise<{ status: 'SUCCESS' | 'MFA_REQUIRED' }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : error.message);

    // Check if this session needs a second MFA factor (Supabase's native AAL system).
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
      setMfaRequired(true);
      return { status: 'MFA_REQUIRED' };
    }
    return { status: 'SUCCESS' };
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
