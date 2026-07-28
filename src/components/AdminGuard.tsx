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
        const { data, error } = await supabase.from('users').select('is_admin').eq('uid', userId).single();
        if (error) {
          console.error('Admin authorization check failed:', error);
          setIsAuthorized(false); // fail closed, not open
          return;
        }
        const isAdminEmail = userEmail === 'adman777888999@gmail.com' || userEmail === 'yo01009950871@gmail.com';
        setIsAuthorized(!!data?.is_admin || isAdminEmail);
      } catch (err) {
        console.error('Admin authorization verification failed:', err);
        setIsAuthorized(false); // fail closed: any error/exception denies access, never grants it
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
