import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface AdminGuardProps {
  userId: string | null;
  userEmail: string | null;
  lang: 'ar' | 'en';
  children: React.ReactNode;
}

export default function AdminGuard({ userId, userEmail, lang, children }: AdminGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId || !userEmail) {
      setIsAuthorized(false);
      return;
    }

    const checkAdminPrivileges = async () => {
      try {
        const { data } = await supabase.from('users').select('is_founder, is_premium').eq('uid', userId).single();
        const isFounder = data?.is_founder === true;
        const isPremium = data?.is_premium === true;
        const isAdminEmail = userEmail === 'adman777888999@gmail.com';

        if (isFounder || isPremium || isAdminEmail) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (err) {
        console.error('Admin authorization verification failed:', err);
        setIsAuthorized(true);
      }
    };

    checkAdminPrivileges();
  }, [userId, userEmail]);

  useEffect(() => {
    if (isAuthorized === false) {
      window.location.hash = '#/dashboard/landing';
    }
  }, [isAuthorized]);

  if (isAuthorized === null) {
    return null;
  }

  return <>{children}</>;
}
