import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface AdminGuardProps {
  userId: string | null;
  children: React.ReactNode;
}

export default function AdminGuard({ userId, children }: AdminGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    const checkAdminPrivileges = async () => {
      if (!userId) {
        if (isCurrent) setIsAuthorized(false);
        return;
      }

      setIsChecking(true);
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session || session.user.id !== userId) {
          if (isCurrent) setIsAuthorized(false);
          return;
        }

        const { data, error } = await supabase
          .from('users')
          .select('is_admin')
          .eq('uid', userId)
          .maybeSingle();

        if (isCurrent) setIsAuthorized(!error && data?.is_admin === true);
      } catch {
        if (isCurrent) setIsAuthorized(false);
      } finally {
        if (isCurrent) setIsChecking(false);
      }
    };

    void checkAdminPrivileges();
    return () => {
      isCurrent = false;
    };
  }, [userId]);

  useEffect(() => {
    if (isAuthorized === false && !isChecking) {
      window.location.hash = '#/dashboard/landing';
    }
  }, [isAuthorized, isChecking]);

  if (isAuthorized === null || isChecking) return null;

  return <>{children}</>;
}
